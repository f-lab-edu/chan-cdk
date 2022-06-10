
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { StackProps, Stack } from 'aws-cdk-lib';
import { RepoConstructStack } from '../construct/RepoConstructStack';
import { VpcConstructStack } from '../construct/VpcConstructStack';
import { RdsConstructStack } from '../construct/RdsConstructStack';
import { EcsConstructStack } from '../construct/EcsConstructStack';
import { ApiGatewayConstructStack } from '../construct/ApiGatewayConstructStack';
import { ServicePipelineConstructStack } from '../construct/ServicePipelineConstruct';
import { ORDER_GIT_REPO } from '../../config/repositoryConfig';

export class OrderStack extends Stack{

  constructor(scope: Construct, id: string, props: StackProps){
    super(scope, id, props);
    
    const applicationName = 'chanorderservice'.toLocaleLowerCase();
    const betaConfig = {
      Cidr : '10.0.0.0/16',
      ServiceName : `${applicationName}Beta`,
      vpcName: `${applicationName}Beta-vpc`,
      ContainerPort : 8080,
      dbInstanceName: `${applicationName}Beta`,
      dbPort : 5432,
      dbAdminName : 'postgres',
    }

    const prodConfig = {
      Cidr : '10.0.100.0/16',
      ServiceName : `${applicationName}`,
      vpcName: `${applicationName}-vpc`,
      ContainerPort : 8080,
      dbInstanceName: `${applicationName}`,
      dbPort : 5432,
      dbAdminName : 'postgres',
    }

    //GitHub & ECR repository Setting
     const serviceRepo = new RepoConstructStack(this, `repo`, {
      ecrName: applicationName, 
      gitRepo: ORDER_GIT_REPO,
      ecrLoad: true,
      stackProps: {stackName : `${applicationName}-repo`, env: props.env}
    });
    
    //VPC Setting
    const vpcBeta = new VpcConstructStack(this, id, {
      vpcName: betaConfig.vpcName,
      azs: 2,
      cidr: betaConfig.Cidr,
      stackProps: {stackName : `${betaConfig.ServiceName}-vpc`, env: props.env}
    });

    //Rds
    const rdsBeta = new RdsConstructStack(this, 'rdsBeta', {
      dbName: betaConfig.ServiceName,
      allocatedStorageGb: 5,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: vpcBeta.vpc,
      port: betaConfig.dbPort,
      subnetType: ec2.SubnetType.PUBLIC,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14_2
      }),
      dbAdminName: betaConfig.dbAdminName,
      dbKeyName: betaConfig.ServiceName,
      stackProps: {stackName : `${betaConfig.ServiceName}-rds`, env: props.env}
    })
  
    //Construct ECS
    const serviceBeta = new EcsConstructStack(this, `ecsBeta`,  {
      serviceName: betaConfig.ServiceName,
      clusterName: `${betaConfig.ServiceName}-cluster`,
      dbKeyName: betaConfig.ServiceName,
      vpc: vpcBeta.vpc,
      db: rdsBeta.db,
      ecrRepo: serviceRepo.ecrRepo,
      containerPort: betaConfig.ContainerPort,
      stackProps: {stackName : `${betaConfig.ServiceName}-ecs`, env: props.env}
    });

    //Consturc ApiGateway
    const api = new ApiGatewayConstructStack(this, 'apigateway', {
      vpc: vpcBeta.vpc,
      endpoint: serviceBeta.loadbalance,
      stackProps: {stackName : `${applicationName}-apigateway`, env: props.env}
    })

    //Construct CI / CD
    const servicePipeline = new ServicePipelineConstructStack(this, `pipeline`, {
      serviceName: applicationName,
      gitRepo: serviceRepo.gitRepo,
      ecrRepo: serviceRepo.ecrRepo,
      stackProps: {stackName : `${applicationName}-cicd`, env: props.env}
    });

    //Dependency Add
    rdsBeta.node.addDependency(vpcBeta);

    serviceBeta.node.addDependency(vpcBeta);
    serviceBeta.node.addDependency(rdsBeta);
    serviceBeta.node.addDependency(serviceRepo);

    api.node.addDependency(vpcBeta);
    api.node.addDependency(serviceBeta);
    api.node.addDependency(serviceRepo);

    servicePipeline.node.addDependency(serviceRepo);
  }
}