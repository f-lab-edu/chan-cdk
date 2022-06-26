
import { Construct } from 'constructs';
import { StackProps, Stack, aws_gamelift } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayV2 from '@aws-cdk/aws-apigatewayv2-alpha';
import { NetworkListener, NetworkLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { HttpApi } from '@aws-cdk/aws-apigatewayv2-alpha';
import { Vpc } from 'aws-cdk-lib/aws-ec2';

export type ChanCommonProps = {
  appllicationName: string,
  stackProps: StackProps,
} 

export type ApiProps = {
  serviceName: string,
  apigateway: HttpApi,
  loadbalancer: NetworkLoadBalancer,
  listener: NetworkListener,
  vpc: Vpc,
  stackProps?: StackProps,
} 

export class ChanCommonStack extends Stack{

  public readonly httpApi: HttpApi;

  constructor(scope: Construct, id: string, props: ChanCommonProps){
    super(scope, id, props.stackProps);

    this.httpApi = new apigatewayV2.HttpApi(this, 'httpApiChan', {
      description: 'HTTP API chan',
      apiName: 'http-api-chan',
      corsPreflight: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: [
          apigatewayV2.CorsHttpMethod.OPTIONS,
          apigatewayV2.CorsHttpMethod.GET,
          apigatewayV2.CorsHttpMethod.POST,
          apigatewayV2.CorsHttpMethod.PUT,
          apigatewayV2.CorsHttpMethod.PATCH,
          apigatewayV2.CorsHttpMethod.DELETE,
        ],
        //allowCredentials: true,
        //allowOrigins: ['http://localhost:3000'],
      },
    });
    
  }
}