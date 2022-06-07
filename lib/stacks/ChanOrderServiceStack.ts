import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ORDER_GIT_REPO } from '../../config/applicationConfig'
import { RepoConstruct } from '../construct/RepoConstruct';
import { ServicePipelineConstruct } from '../construct/ServicePipelineConstruct';
import { EcsConstruct, EcsConstructProps } from '../construct/EcsConstruct'

export class ChanOrderServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //GitHub & ECR repository Setting
    const servieRepo = new RepoConstruct(this, `repo`, {
      serviceName: id, 
      gitRepo: ORDER_GIT_REPO,
      ecrLoad: false,
    });
    
    //Construct Beta ECS
    const serviceBetaBeta = new EcsConstruct(this, `ecsBeta`,  {
      servicekName: `${id}Beta`,
      ecrRepo: servieRepo.ecrRepo,
      publicLoadBalancer: true,
      containerPort: 8080,
      vpcCidr: '10.0.0.0/16',
      clusterName: `${id}-beta-cluster`
    });

    /*
    //Construct Production ECS
    const serviceEcsProd = new EcsConstruct(this, `ecsProd`,  {
      servicekName: `${id}Production`,
      ecrRepo: servieRepo.ecrRepo,
      publicLoadBalancer: true,
      containerPort: 8080,
      vpcCidr: '10.1.0.0/16',
      clusterName: `${id}-prod-cluster`
    });
    */

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
  