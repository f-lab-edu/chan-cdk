
import { Construct } from 'constructs';
import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbtargets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Secret } from 'aws-cdk-lib/aws-ecs';
import { VpcLink } from 'aws-cdk-lib/aws-apigateway';

export type EcsConstructProps = {
  serviceName: string,
  ecrRepo: ecr.IRepository,
  containerPort: number,
  vpc: ec2.Vpc
  db: rds.DatabaseInstance,
  dbKeyName: string,
  clusterName: String,
  stackProps?: StackProps,
}

export class EcsConstructStack extends Stack{

  public readonly service:ecsp.ApplicationLoadBalancedEc2Service;
  public readonly cluster:ecs.Cluster;
  public readonly loadbalance:elb.NetworkLoadBalancer;
  public readonly vpcLink:VpcLink;

  constructor(scope: Construct, id: string, props: EcsConstructProps){
    super(scope, id, props.stackProps);
    
    //find service
    const vpc = props.vpc
    const ecrRepo = props.ecrRepo;
    const dbSecret = props.db.secret;

    if(!dbSecret) throw 'db secret error';

    const cluster = new ecs.Cluster(this, `cluster`, { 
      clusterName: `${props.clusterName}`,
      vpc,
      capacity: {
        autoScalingGroupName: `${props.serviceName}-asg`,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
        desiredCapacity: 1,
        maxCapacity: 4,
        minCapacity: 1,
      },
    });

    const taskDefinition = new ecs.TaskDefinition(this, 'TaskDef', {
      compatibility: ecs.Compatibility.EC2,
      memoryMiB: '512',
      cpu: '256',
    });

    taskDefinition.addContainer(`container`, {
      containerName: `${props.serviceName}-container`,
      image: ecs.ContainerImage.fromEcrRepository(ecrRepo, 'latest'),
      memoryLimitMiB: 256,
      secrets: {
        DATABASE_USERNAME: Secret.fromSecretsManager(dbSecret, "username"),
        DATABASE_PASSWORD: Secret.fromSecretsManager(dbSecret, "password"),
        DATABASE_HOST: Secret.fromSecretsManager(dbSecret, "host"),
        DATABASE_NAME: Secret.fromSecretsManager(dbSecret, "dbname"),
        DATABASE_PORT: Secret.fromSecretsManager(dbSecret, "port"),
      },
      cpu: 256,
      portMappings:[
        {hostPort:80, containerPort: props.containerPort, protocol: ecs.Protocol.TCP},
      ]
    })

    const service = new ecsp.ApplicationLoadBalancedEc2Service(this, `${props.serviceName}`, {
      loadBalancerName: `${props.serviceName}-alb`,
      cluster: cluster,
      cpu: 256,
      memoryLimitMiB: 256,
      desiredCount: 1,
      minHealthyPercent: 50,
      maxHealthyPercent: 300,
      serviceName: props.serviceName,
      taskDefinition: taskDefinition,
      publicLoadBalancer: false,
    });
    
    service.targetGroup.configureHealthCheck({
      "path": '/',
      "interval": Duration.seconds(5),
      "timeout": Duration.seconds(4),
      "healthyThresholdCount": 2,
      "unhealthyThresholdCount": 2,
      "healthyHttpCodes": "200,301,302",
    });

    service.service.autoScaleTaskCount({
      maxCapacity: 5,
    }).scaleOnCpuUtilization('Scaling', {
      targetUtilizationPercent: 50,
    })

    const nlb = new elb.NetworkLoadBalancer(this, 'nlb', {
      loadBalancerName: `${props.serviceName}-nlb`,
      vpc,
      crossZoneEnabled: true,
      internetFacing: true,
    });
    
    const listener = nlb.addListener('listener', { port: 80 });
    
    const nlbTagerGroup = listener.addTargets('Targets', {
      targets: [new elbtargets.AlbTarget(service.loadBalancer, 80)],
      port: 80,
    });

    const vpclink = new VpcLink(this, 'link', {
     vpcLinkName: `${props.serviceName}-vpc`,
       targets: [ nlb ],
   });

    nlbTagerGroup.node.addDependency(service.listener);

    new CfnOutput(this, 'NlbEndpoint', { value: `http://${nlb.loadBalancerDnsName}`});

    this.vpcLink = vpclink;
    this.loadbalance = nlb;
    this.service = service;
    this.cluster = cluster;

  }
}