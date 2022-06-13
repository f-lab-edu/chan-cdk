
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { StackProps, Stack } from 'aws-cdk-lib';
import { RepoConstructStack } from '../construct/RepoConstructStack';
import { VpcConstructStack } from '../construct/VpcConstructStack';
import { RdsConstructStack } from '../construct/RdsConstructStack';
import { EcsConstructStack } from '../construct/EcsConstructStack';
import { CicdConstructStack } from '../construct/CicdConstructStack';
import { CUSTOMER_GIT_REPO } from '../../config/repositoryConfig';

export type ChanCustomerProps = {
  applicationName: string,
  stackProps: StackProps,
} 

export class ChanCustomerStack extends Stack{

  constructor(scope: Construct, id: string, props: ChanCustomerProps){
    super(scope, id, props.stackProps);
    
    
    const applicationName = props.applicationName.toLocaleLowerCase();

    const betaConfig = {
      Cidr : '10.0.0.0/16',
      ServiceName : `${applicationName}`,
      vpcName: `${applicationName}Beta-vpc`,
      ContainerPort : 8080,
      dbInstanceName: `${applicationName}`,
      dbPort : 5432,
      dbAdminName : 'postgres',
    }

    //GitHub & ECR repository Setting
     const serviceRepo = new RepoConstructStack(this, `repo`, {
      ecrName: applicationName, 
      gitRepo: CUSTOMER_GIT_REPO,
      ecrLoad: false,
      stackProps: {stackName : `${props.stackProps.stackName}-repo`, env: props.stackProps.env}
    });
    
    //VPC Setting
    const vpcBeta = new VpcConstructStack(this, `vpcBeta`, {
      vpcName: betaConfig.vpcName,
      azs: 2,
      cidr: betaConfig.Cidr,
      stackProps: {stackName : `${props.stackProps.stackName}-vpc`, env: props.stackProps.env}
    });

    
    //Rds Setting
    const rdsBeta = new RdsConstructStack(this, `rdsBeta`, {
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
      stackProps: {stackName : `${props.stackProps.stackName}-rds`, env: props.stackProps.env}
    })
    
    //Ecs Setting
    const serviceBeta = new EcsConstructStack(this, `ecsBeta`,  {
      serviceName: betaConfig.ServiceName,
      clusterName: `${betaConfig.ServiceName}-cluster`,
      dbKeyName: betaConfig.ServiceName,
      vpc: vpcBeta.vpc,
      db: rdsBeta.db,
      ecrRepo: serviceRepo.ecrRepo,
      containerPort: betaConfig.ContainerPort,
      stackProps: {stackName : `${props.stackProps.stackName}-ecs`, env: props.stackProps.env}
    });
    
    //CI / CD Setting
    const serviceCicd = new CicdConstructStack(this, `cicd`, {
      serviceName: `${applicationName}`,
      gitRepo: serviceRepo.gitRepo,
      ecrRepo: serviceRepo.ecrRepo,
      serviceBeta: serviceBeta.service,
      stackProps: {stackName : `${props.stackProps.stackName}-cicd`, env: props.stackProps.env}
    });
    
    
    //Dependency Add
    rdsBeta.node.addDependency(vpcBeta);

    serviceBeta.node.addDependency(vpcBeta);
    serviceBeta.node.addDependency(rdsBeta);
    serviceBeta.node.addDependency(serviceRepo);

    serviceCicd.node.addDependency(serviceRepo);
    
    
  }
}