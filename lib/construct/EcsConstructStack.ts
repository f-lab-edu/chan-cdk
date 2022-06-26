
import { Construct } from 'constructs';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbtargets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Secret } from 'aws-cdk-lib/aws-ecs';
import { VpcLink } from 'aws-cdk-lib/aws-apigateway';
import { Protocol, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { SERVICE } from '../stacks/ChanStack';

export type EcsConstructProps = {
  serviceName: string,
  ecrRepo: ecr.IRepository,
  containerPort: number,
  vpc: ec2.Vpc
  loadbalancer: elb.NetworkLoadBalancer,
  db: rds.DatabaseInstance,
  dbKeyName: string,
  clusterName: String,
  containerEnv: {[key : string]: string},
  //endpointDns: { [key in SERVICE]?: string},
  stackProps?: StackProps,
}

export class EcsConstructStack extends Stack{

  public readonly loadbalancer: elb.NetworkLoadBalancer;
  public readonly listner: elb.NetworkListener;

  constructor(scope: Construct, id: string, props: EcsConstructProps){
    super(scope, id, props.stackProps);
    
    //find service
    const vpc = props.vpc
    const ecrRepo = props.ecrRepo;
    const dbSecret = props.db.secret;
    if(!dbSecret) throw 'db secret error';

    const instanceSecurityGroup = new ec2.SecurityGroup(this, 'instanceSecurityGroup', { 
      securityGroupName: `${props.serviceName}-asg-instance-sg`,
      vpc,
      allowAllOutbound: true,
    });

    instanceSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(),ec2.Port.allTraffic())
    instanceSecurityGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const autoScalingGroup = new AutoScalingGroup(this, 'asg', {
      autoScalingGroupName: `${props.serviceName}-asg`,
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
      desiredCapacity: 2,
      maxCapacity: 4,
      minCapacity: 2,
      securityGroup: instanceSecurityGroup,
    });
    autoScalingGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const cluster = new ecs.Cluster(this, `cluster`, { 
      clusterName: `${props.clusterName}`,
      vpc,
    });

    cluster.addAsgCapacityProvider(new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', {
      autoScalingGroup,
    }));
    
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
     environment: props.containerEnv,
      cpu: 256,
      portMappings:[
        {hostPort:80, containerPort: props.containerPort, protocol: ecs.Protocol.TCP},
      ]
    })

    const service = new ecsp.NetworkLoadBalancedEc2Service(this, `${props.serviceName}`, {
      cluster: cluster,
      cpu: 256,
      loadBalancer: props.loadbalancer,
      memoryLimitMiB: 256,
      desiredCount: 2,
      minHealthyPercent: 50,
      maxHealthyPercent: 300,
      serviceName: props.serviceName,
      taskDefinition: taskDefinition,
      publicLoadBalancer: false,
    });
    
    service.targetGroup.configureHealthCheck({
      protocol: elb.Protocol.HTTP,
      path: "/",
    })
    
    this.loadbalancer = service.loadBalancer;
    this.listner = service.listener;

    /*
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
    */
    //new CfnOutput(this, 'NlbEndpoint', { value: `http://${service.loadBalancer.loadBalancerDnsName}`});

  }


  private sliceDns = (fullDns: string | undefined) => {
    if(!fullDns) return '';

    const pos = fullDns.indexOf(':');
    return fullDns.substring(pos+1);
  }
  
}