
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { ApiProps } from '../stacks/ChanCommonStack';
import { VpcLink } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpMethod } from 'aws-cdk-lib/aws-events';
import { HttpNlbIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';

export class LogisticsApiStack extends Stack{

  private readonly integration: HttpNlbIntegration;

  constructor(scope: Construct, id: string, props: ApiProps){
    super(scope, id, props.stackProps);
      
      const api = props.apigateway;
      this.integration = new HttpNlbIntegration('root', props.listener,{
        vpcLink: new VpcLink(this, 'vpcLink', {
          vpcLinkName: `${props.serviceName}-vpclink`,
          vpc: props.vpc,
          //subnets:  {subnetType: SubnetType.PRIVATE_ISOLATED}
        })
      })
      
      api.addRoutes(this.routeProps('/logistics/invoice', HttpMethod.GET));
      api.addRoutes(this.routeProps('/logistics/invoice', HttpMethod.POST));

      api.addRoutes(this.routeProps('/logistics/localCode/{sigungu}', HttpMethod.GET));

      api.addRoutes(this.routeProps('/logistics/center/{localCode}', HttpMethod.GET));
      api.addRoutes(this.routeProps('/logistics/center', HttpMethod.POST));

  }

  private routeProps = (path:string, method: HttpMethod) =>{
    return {
      path,
      methods: [method],
      integration: this.integration,
    }
  }

  
}