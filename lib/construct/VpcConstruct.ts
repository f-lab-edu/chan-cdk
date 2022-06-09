
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Duration, StackProps } from 'aws-cdk-lib';
import { StringifyOptions } from 'querystring';

export type VpcProps = {
  cidr: string,
  azs: number,
}


export class VpcConstruct extends Construct{

  public readonly vpc:ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcProps){
    super(scope, id);

    //AWS Nat GateWay대신에 instance 생성해서 nat instance로 사용
    const natGatewayProvider = ec2.NatProvider.instance({
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
    });

    //Load balancer, nat instance는 public에
    //applicaion instance는 private에
    //db는 isolate에
    //mask는 24면 2^8 - 5 = 251개씩 사용 가능
    const vpc = new ec2.Vpc(this, 'vpc', { 
      maxAzs: props.azs,
      cidr: props.cidr,
      natGatewayProvider: natGatewayProvider,
      subnetConfiguration: [
        { name: 'public' , cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC },
        { name: 'private', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
        { name: 'isolate', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ]
    });

    this.vpc = vpc;
  }
}