import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { ORDER_GIT_REPO } from '../../config/applicationConfig'
import { RepoConstruct } from '../construct/RepoConstruct';
import { ServicePipelineConstruct } from '../construct/ServicePipelineConstruct';
import { EcsConstruct} from '../construct/EcsConstruct';
import { RdsConstruct } from '../construct/RdsConstruct';
import { PostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { VpcConstruct } from '../construct/VpcConstruct';

export type stackConfig = {
  prodCidr: string,
  betaCidr: string,
  betaContainerPort: number;
  dbPort: number;
  dbAdminName: string,
  props?: StackProps,
}

export class ChanOrderServiceStack extends Stack {
  constructor(scope: Construct, id: string, config: stackConfig) {
    super(scope, id, config.props);

    //GitHub & ECR repository Setting
    const servieRepo = new RepoConstruct(this, `repo`, {
      serviceName: id, 
      gitRepo: ORDER_GIT_REPO,
      ecrLoad: false,
    });
    
    //VPC Setting
    const vpcBeta = new VpcConstruct(this, id, {
      azs: 2,
      cidr: config.betaCidr,
    });

    //Rds
    const rdsBeta = new RdsConstruct(this, 'rdsBeta', {
      dbName: `${id}BetaDb`,
      allocatedStorageGb: 5,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpcBeta.vpc,
      port: config.dbPort,
      subnetType: ec2.SubnetType.PUBLIC,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_14_2
      }),
      dbAdminName: config.dbAdminName,
      dbKeyName: `${id}`,
    })
  
    //Construct ECS
    const serviceBeta = new EcsConstruct(this, `${id}Beta`,  {
      servicekName: `${id}Beta`,
      clusterName: `${id}-beta-cluster`,
      ecrRepo: servieRepo.ecrRepo,
      publicLoadBalancer: true,
      containerPort: config.betaContainerPort,
      vpc: vpcBeta.vpc,
      db: rdsBeta.db,
      dbInfo: rdsBeta.dbInfo,
    });
    
    //Construct CI / CD
    const servicePipeline = new ServicePipelineConstruct(this, `pipeline`, {
      serviceName: `${id}Beta`,
      clusterName: `${id}-beta-cluster`,
      pipelineName: `${id}-pipeline`,
      repo: servieRepo,
      serviceBeta: serviceBeta.service,
      cluster: serviceBeta.cluster,
    });

    //Dependency Add
    rdsBeta.node.addDependency(vpcBeta);

    serviceBeta.node.addDependency(vpcBeta);
    serviceBeta.node.addDependency(rdsBeta);
    serviceBeta.node.addDependency(servieRepo);

    servicePipeline.node.addDependency(servieRepo);
  }
}
  