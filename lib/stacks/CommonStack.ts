
import { Construct } from 'constructs';
import { StackProps, Stack } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';


export class CommonStack extends Stack{

  public readonly agw:apigateway.RestApi;

  constructor(scope: Construct, id: string, props: StackProps){
    super(scope, id, props);

    const api = new apigateway.RestApi(this, 'Endpoint', {
      restApiName: props.tags?.serviceName,
      description: `${props.tags?.serviceName} api gateway`,
    });

    api.root.addMethod("GET");

    this.agw = api;

  }
}