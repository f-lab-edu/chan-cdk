
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Duration } from 'aws-cdk-lib';
import * as secretmanager from 'aws-cdk-lib/aws-secretsmanager';
import { dbInfo } from './RdsConstruct';

export type EcsConstructProps = {
  servicekName: string,
  ecrRepo: ecr.IRepository,
  publicLoadBalancer: boolean,
  containerPort: number,
  vpc: ec2.Vpc,
  clusterName: String,
  db: rds.DatabaseInstance,
  dbInfo: dbInfo,
}

export class EcsConstruct extends Construct{

  public readonly service:ecsp.ApplicationLoadBalancedEc2Service;
  public readonly cluster:ecs.Cluster;

  constructor(scope: Construct, id: string, props: EcsConstructProps){
    super(scope, id);

    const cluster = new ecs.Cluster(this, `clusterBeta`, { 
      clusterName: `${props.clusterName}`,
      vpc: props.vpc,
      capacity: {
        autoScalingGroupName: `${props.servicekName}-asg`,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
        desiredCapacity: 1,
        maxCapacity: 2,
        minCapacity:1,
      }
    });

    this.cluster = cluster;

    const taskDefinition = new ecs.TaskDefinition(this, 'TaskDef', {
      compatibility: ecs.Compatibility.EC2,
      memoryMiB: '512',
      cpu: '256',
    });

    taskDefinition
    .addContainer(`container`, {
      containerName: `${props.servicekName}-container`,
      image: ecs.ContainerImage.fromEcrRepository(props.ecrRepo, 'latest'),
      memoryLimitMiB: 256,
      environment: {
        DATABASE_NAME: props.dbInfo.dbName,
        DATABASE_HOST: props.dbInfo.dbHost,
        DATABASE_PORT: props.dbInfo.dbPort,
        DATABASE_USERNAME: props.dbInfo.dbAdminName,
        DATABASE_KEYNAME: props.dbInfo.dbKeyName,
        DATABASE_KEYARN: props.dbInfo.dbKeyArn,
      },
      cpu: 256,
    }).addPortMappings({ 
      containerPort: props.containerPort, 
      hostPort:80,
      protocol:ecs.Protocol.TCP 
    });

    const service = new ecsp.ApplicationLoadBalancedEc2Service(this, `${props.servicekName}`, {
      cluster: cluster,
      cpu: 256,
      memoryLimitMiB: 256,
      desiredCount: 1,
      minHealthyPercent: 50,
      maxHealthyPercent: 300,
      serviceName: props.servicekName,
      taskDefinition: taskDefinition,
      publicLoadBalancer: props.publicLoadBalancer,
    });  

    //health check
    service.targetGroup.configureHealthCheck({
      "path": '/',
      "interval": Duration.seconds(5),
      "timeout": Duration.seconds(4),
      "healthyThresholdCount": 2,
      "unhealthyThresholdCount": 2,
      "healthyHttpCodes": "200,301,302",
    });

    //scaling
    const scaleableTaskCount = service.service.autoScaleTaskCount({
      maxCapacity: 2,
    })

    scaleableTaskCount.scaleOnCpuUtilization('Scaling', {
      targetUtilizationPercent: 50,
    })

    this.service = service;
    
  }
}