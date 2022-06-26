
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { CfnOutput, Fn, Stack } from 'aws-cdk-lib';
import { RepoConstructStack } from '../construct/RepoConstructStack';
import { EcsConstructStack } from '../construct/EcsConstructStack';
import { CUSTOMER_GIT_REPO } from '../../config/repositoryConfig';
import { ChanServiceProps, SERVICE } from './ChanStack';
import { CustomerApiStack } from '../api/CustomerApiStack';
import { VpcLink } from 'aws-cdk-lib/aws-apigateway';
import { InterfaceVpcEndpoint } from 'aws-cdk-lib/aws-ec2';
import { EndpointConstructStack } from '../construct/EndpointConstructStack';
import { RdsConstructStack } from '../construct/RdsConstructStack';

export class ChanCustomerStack extends Stack{

  constructor(scope: Construct, id: string, props: ChanServiceProps){
    super(scope, id, props.stackProps);
    
    const applicationName = props.appllicationName.toLocaleLowerCase();

    const betaConfig = {
      serviceName : `${applicationName}`,
      ContainerPort : 8080,
      dbInstanceName: `${applicationName}`,
      dbPort : 5432,
      dbAdminName : 'postgres',
    }
    
    const vpc = props.vpc;
    
    //GitHub & ECR repository Setting
     const serviceRepo = new RepoConstructStack(this, `repo`, {
      ecrName: applicationName, 
      gitRepo: CUSTOMER_GIT_REPO,
      ecrLoad: false,
      stackProps: {stackName : `${props.stackProps.stackName}-repo`, env: props.stackProps.env}
    });
  
    //Rds Setting
    const rdsInsatnce = new RdsConstructStack(this, `rds`, {
      dbName: betaConfig.serviceName,
      allocatedStorageGb: 5,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      port: betaConfig.dbPort,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14_2
      }),
      dbAdminName: betaConfig.dbAdminName,
      dbKeyName: betaConfig.serviceName,
      stackProps: {stackName : `${props.stackProps.stackName}-rds`, env: props.stackProps.env}
    })

    //endpoint Setting
    const endpoints = new EndpointConstructStack(this, 'endpoint', {
      serviceName: betaConfig.serviceName,
      vpc,
      serviceId: SERVICE.CUSTOMER,
      serviceList: props.endpoints,
      stackProps: {stackName : `${props.stackProps.stackName}-endpoint`, env: props.stackProps.env},
    })

    const dns = {
      [SERVICE.SELLER]: Fn.importValue(`${betaConfig.serviceName}-${SERVICE.SELLER.toString()}-dns`),
    }

    //Ecs Setting
    const service = new EcsConstructStack(this, `ecs`,  {
      serviceName: betaConfig.serviceName,
      clusterName: `${betaConfig.serviceName}-cluster`,
      dbKeyName: betaConfig.serviceName,
      vpc,
      loadbalancer: props.loadbalancer,
      containerEnv:{
        ENDPOINT_SELLER: dns[SERVICE.SELLER],
      },
      db: rdsInsatnce.db,
      ecrRepo: serviceRepo.ecrRepo,
      containerPort: betaConfig.ContainerPort,
      stackProps: {stackName : `${props.stackProps.stackName}-ecs`, env: props.stackProps.env},
    });

    service.addDependency(endpoints);

    const restApi = new CustomerApiStack(this, `api`,  {
      serviceName: betaConfig.serviceName,
      vpc,
      apigateway: props.httpApi,
      loadbalancer: props.loadbalancer,
      listener: service.listner,
      stackProps: {stackName : `${props.stackProps.stackName}-api`, env: props.stackProps.env}
    });
  
    /*
    //CI / CD Setting
    const serviceCicd = new CicdConstructStack(this, `cicd`, {
      serviceName: `${applicationName}`,
      gitRepo: serviceRepo.gitRepo,
      ecrRepo: serviceRepo.ecrRepo,
      //serviceBeta: service.service,
      stackProps: {stackName : `${props.stackProps.stackName}-cicd`, env: props.stackProps.env}
    });
    */
    
  }

}