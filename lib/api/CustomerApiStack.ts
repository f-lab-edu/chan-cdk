
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
      api.addRoutes(this.routeProps('/customerHi', HttpMethod.GET));
      api.addRoutes(this.routeProps('/customerToSeller', HttpMethod.GET));


      api.addRoutes(this.routeProps('/account', HttpMethod.POST));
      api.addRoutes(this.routeProps('/account/{id}', HttpMethod.GET));

  }

  private routeProps = (path:string, method: HttpMethod) =>{
    return {
      path,
      methods: [method],
      integration: this.integration,
    }
  }

  
}