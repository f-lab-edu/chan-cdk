
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import { ApiProps } from '../stacks/ChanCommonStack';
import { HttpApi, VpcLink } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpNlbIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import { HttpMethod } from 'aws-cdk-lib/aws-events';

export class SellerApiStack extends Stack{

  private readonly integration: HttpNlbIntegration;

  constructor(scope: Construct, id: string, props: ApiProps){
    super(scope, id, props.stackProps);
      
      const api = props.apigateway;
      this.integration = new HttpNlbIntegration('root', props.listener,{
        vpcLink: new VpcLink(this, 'vpcLink', {
          vpcLinkName: `${props.serviceName}-vpclink`,
          vpc: props.vpc,
          subnets:  {subnetType: SubnetType.PRIVATE_ISOLATED}
        })
      })
      
      api.addRoutes(this.routeProps('/sellerHi', HttpMethod.GET));
  }

  private routeProps = (path:string, method: HttpMethod) =>{
    return {
      path,
      methods: [method],
      integration: this.integration,
    }
  }

}