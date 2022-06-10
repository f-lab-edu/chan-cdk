
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Duration, StackProps, Stack } from 'aws-cdk-lib';
import { StringifyOptions } from 'querystring';
import { Service } from 'aws-cdk-lib/aws-servicediscovery';

export type ApiGatewayConstructProps = {
  serviceName: string,
  vpc: ec2.Vpc;
  endpoint:elb.NetworkLoadBalancer;
  stackProps?: StackProps
} 

export class ApiGatewayConstructStack extends Stack{

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps){
    super(scope, id, props.stackProps);

    //find service
    const vpc = props.vpc;

    const vpclinks = 
     new apigateway.VpcLink(this, 'link', {
        targets: [ props.endpoint ],
      });
  
    const integration = new apigateway.Integration({
        type: apigateway.IntegrationType.HTTP_PROXY,
        options: {
          connectionType: apigateway.ConnectionType.VPC_LINK,
          vpcLink: vpclinks,
        },
      });
/*
    const api = new apigateway.RestApi(this, 'Endpoint', {
      restApiName: props.serviceName,
      description: 'chan Order api gateway',
    });
    api.add

    api.root.addMethod('GET', integration);
    */
/*
    //Hello
    const hello = api.root.addResource('hello');
    hello.addMethod('GET');

    //Account
    const account = api.root.addResource('account');
    account.addMethod('POST');
    
    const accountId = account.addResource('{id}');
    accountId.addMethod('GET'); 
*/


  }
}