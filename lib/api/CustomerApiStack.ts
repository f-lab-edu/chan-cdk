
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import { ApiProps } from '../stacks/ChanCommonStack';
import { HttpApi, VpcLink } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpMethod } from 'aws-cdk-lib/aws-events';
import { HttpNlbIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';

export class CustomerApiStack extends Stack{

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
      
      api.addRoutes(this.routeProps('/', HttpMethod.GET));
      api.addRoutes(this.routeProps('/customer/member/{accountId}', HttpMethod.GET));
      api.addRoutes(this.routeProps('/customer/member', HttpMethod.POST));
      api.addRoutes(this.routeProps('/customer/member', HttpMethod.PUT));

      api.addRoutes(this.routeProps('/customer/order', HttpMethod.GET));
      api.addRoutes(this.routeProps('/customer/order', HttpMethod.POST));
      api.addRoutes(this.routeProps('/customer/order', HttpMethod.PUT));

  }

  private routeProps = (path:string, method: HttpMethod) =>{
    return {
      path,
      methods: [method],
      integration: this.integration,
    }
  }

  
}