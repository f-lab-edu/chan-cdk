
import { Construct } from 'constructs';
import { StackProps, Stack, Fn } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ChanCustomerStack } from './ChanCustomerStack';
import { ChanCommonStack } from './ChanCommonStack';
import { ChanSellerStack } from './ChanSellerStack';
import { VpcConstructStack } from '../construct/VpcConstructStack';
import { HttpApi } from '@aws-cdk/aws-apigatewayv2-alpha';

export enum SERVICE{
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  DELIVERY = 'DELIVERY',
  LOGISTICS = 'LOGISTICS',
}

export type ChanServiceProps = {
  appllicationName: string,
  vpc: ec2.Vpc,
  loadbalancer: elb.NetworkLoadBalancer,
  httpApi: HttpApi,
  endpoints: {id: SERVICE, serviceName: string}[],
  stackProps: StackProps,
} 

export class ChanStack extends Stack{

  constructor(scope: Construct, id: string, props: StackProps){
    super(scope, id, props);

    const appllicationName = "chan";

    const common = new ChanCommonStack(this, 'common', {
      appllicationName: appllicationName,
      stackProps: {env: props.env, stackName: `${appllicationName}-common`},
    })

    //VPC Setting
    const customerVpc = new VpcConstructStack(this, `customer-vpc`, {
      serviceName: `${appllicationName}customer`,
      cidr:  '10.0.0.0/16',
      stackProps: {env: props.env, stackName : `${appllicationName}-customer-vpc`}
    });

    const sellerVpc = new VpcConstructStack(this, `seller-vpc`, {
      serviceName: `${appllicationName}seller`,
      cidr:  '10.1.0.0/16',
      stackProps: {env: props.env, stackName : `${appllicationName}-seller-vpc`}
    });

    const endpoints = [
        {id: SERVICE.CUSTOMER, serviceName: customerVpc.endpointService.vpcEndpointServiceName} ,
        {id: SERVICE.SELLER  , serviceName: sellerVpc.endpointService.vpcEndpointServiceName } ,
    ];

    const customer = new ChanCustomerStack(this, 'customer', {
      appllicationName: `${appllicationName}customer`,
      vpc: customerVpc.vpc,
      loadbalancer: customerVpc.loadbalancer,
      httpApi: common.httpApi,
      endpoints,
      stackProps: {env: props.env, stackName: `${appllicationName}-customer`},
    });

    const seller = new ChanSellerStack(this, 'seller', {
      appllicationName: `${appllicationName}seller`,
      vpc: sellerVpc.vpc,
      loadbalancer: sellerVpc.loadbalancer,
      httpApi: common.httpApi,
      endpoints,
      stackProps: {env: props.env, stackName: `${appllicationName}-seller`},
    });
  }
  
}