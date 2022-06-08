import { Names, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ORDER_GIT_REPO } from '../../config/applicationConfig'
import { RepoConstruct } from '../construct/RepoConstruct';
import { ServicePipelineConstruct } from '../construct/ServicePipelineConstruct';
import { EcsConstruct, EcsConstructProps } from '../construct/EcsConstruct';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { EC2_UNIQUE_IMDSV2_LAUNCH_TEMPLATE_NAME } from 'aws-cdk-lib/cx-api';
import { NetworkMultipleTargetGroupsServiceBase } from 'aws-cdk-lib/aws-ecs-patterns';

export type stackConfig = {
  prodCidr: string,
  betaCidr: string,
  betaContainerPort: number;
  props?: StackProps,
}

export class ChanOrderServiceStack extends Stack {
  constructor(scope: Construct, id: string, config: stackConfig) {
    super(scope, id, config.props);

    //GitHub & ECR repository Setting
    const servieRepo = new RepoConstruct(this, `repo`, {
      serviceName: id, 
      gitRepo: ORDER_GIT_REPO,
      ecrLoad: true,
    });
    
    //Construct Beta ECS
    const serviceBetaBeta = new EcsConstruct(this, `ecsBeta`,  {
      servicekName: `${id}Beta`,
      ecrRepo: servieRepo.ecrRepo,
      publicLoadBalancer: true,
      containerPort: config.betaContainerPort,
      vpcBetaCidr: config.betaCidr,
      vpcProdCidr: config.prodCidr,
      clusterName: `${id}-beta-cluster`
    });

    //Construct CI / CD
    const servicePipeline = new ServicePipelineConstruct(this, `pipeline`, {
      pipelineName: `${id}-pipeline`,
      repo: servieRepo,
      serviceBeta: serviceBetaBeta.service,
    });

    //Dependency Add
    //serviceEcsProd.node.addDependency(servieRepo);
    serviceBetaBeta.node.addDependency(servieRepo);
    servicePipeline.node.addDependency(servieRepo);
    
  }
}
  