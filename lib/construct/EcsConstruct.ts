
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Duration, StackProps } from 'aws-cdk-lib';
import { StringifyOptions } from 'querystring';

export type EcsConstructProps = {
  servicekName: string,
  ecrRepo: ecr.IRepository,
  publicLoadBalancer: boolean,
  containerPort: number,
  vpcCidr: string,
  clusterName: String,

}


export class EcsConstruct extends Construct{

  public readonly service:ecs.Ec2Service;
  public readonly lb:elb.ApplicationLoadBalancer; 

  constructor(scope: Construct, id: string, props: EcsConstructProps){
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'vpc', { 
      maxAzs: 2,
      cidr: props.vpcCidr,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC },
        { name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
        { name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ]},
    );

    const clusterBeta = new ecs.Cluster(this, `clusterBeta`, { 
      clusterName: `${props.clusterName}`,
      vpc: vpc,
    });

    const taskDefinition = new ecs.TaskDefinition(this, 'TaskBeta', {
      compatibility: ecs.Compatibility.EC2,
      memoryMiB: '512',
      cpu: '256',
    });
    
    taskDefinition
    .addContainer(`container`, {
      containerName: `${props.servicekName}-container`,
      image: ecs.ContainerImage.fromEcrRepository(props.ecrRepo, 'latest'),
      memoryLimitMiB: 256,
      cpu: 256,
    })
    .addPortMappings({ 
      containerPort: props.containerPort, 
      hostPort:80,
      protocol:ecs.Protocol.TCP 
    });

    clusterBeta.addCapacity('autoscalegroup', {
      autoScalingGroupName: `${props.servicekName}-asg`,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      desiredCapacity: 1,
      maxCapacity: 2,
      minCapacity: 1,
    });

    const service = new ecsp.ApplicationLoadBalancedEc2Service(this, `${props.servicekName}`, {
      cluster: clusterBeta,
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

    this.service = service.service;
    this.lb = service.loadBalancer;

  }
}