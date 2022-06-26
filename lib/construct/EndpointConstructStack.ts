
import { Construct } from 'constructs';
import {StackProps, Stack, Fn, CfnOutput } from 'aws-cdk-lib';
import { SERVICE } from '../stacks/ChanStack';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export type EndpointProps = {
  serviceName: string,
  serviceId: SERVICE,
  vpc: ec2.Vpc,
  serviceList: {id: SERVICE, serviceName: string}[],
  stackProps?: StackProps,
}

export class EndpointConstructStack extends Stack{
  
  constructor(scope: Construct, id: string, props: EndpointProps){
    super(scope, id, props.stackProps);

    const dns : { [key in SERVICE]?: string} = {};
    const endpoints: {[kye in SERVICE]?: string[]} = {};

    const sg = new ec2.SecurityGroup(this, 'instanceSecurityGroup', { 
      securityGroupName: `${props.serviceName}-endpoint-sg`,
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    sg.addIngressRule(ec2.Peer.ipv4(props.vpc.vpcCidrBlock),ec2.Port.allTcp())


    props.serviceList.forEach( (el, index) => {
      if(el.id == props.serviceId) return;
      
      const interfaceEndpoint = new ec2.InterfaceVpcEndpoint(this, `${props.serviceName}-${el.id.toString()}-dns}`, {
        vpc: props.vpc,
        securityGroups: [sg],
        service : new ec2.InterfaceVpcEndpointService(el.serviceName),
      });

      new CfnOutput(this, `${props.serviceName}-${el.id.toString()}-dns`, {
        value:  Fn.select(1, Fn.split(':', Fn.select(0, interfaceEndpoint.vpcEndpointDnsEntries))),
        exportName: `${props.serviceName}-${el.id.toString()}-dns`,
      })

    })

  }
  
}