
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
  vpc: ec2.Vpc;
  endpoint:elb.NetworkLoadBalancer;
  stackProps?: StackProps
} 

export class ApiGatewayConstructStack extends Stack{

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps){
    super(scope, id, props.stackProps);

    //find service
    const vpc = props.vpc;

    const api = new apigateway.RestApi(this, 'Endpoint', {
      description: 'example api gateway',
      deployOptions: {
        stageName: 'dev',
      },
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowCredentials: true,
        allowOrigins: ['http://localhost:3000'],
      },
    });

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

    const order = api.root.addResource('order');
    const proxy = order.addProxy({
      defaultIntegration: integration,
    })
    

  }
}