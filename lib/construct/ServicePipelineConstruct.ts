import { Arn, Duration, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Pipeline, Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { IRepo } from './RepoConstruct';
import { CodeBuildAction, CodeDeployEcsDeployAction, EcsDeployAction, GitHubSourceAction, ManualApprovalAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { BuildSpec, Cache, LinuxBuildImage, LocalCacheMode, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import buildSpecContent from '../../config/buildSpecContent';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Cluster, Ec2Service } from 'aws-cdk-lib/aws-ecs';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { EcsApplication, EcsDeploymentGroup, ServerDeploymentGroup } from 'aws-cdk-lib/aws-codedeploy';
import { Service } from 'aws-cdk-lib/aws-servicediscovery';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';

export interface PipelineConfig{
  serviceName: string,
  pipelineName: string,
  clusterName: string,
  repo: IRepo,
  serviceBeta: ecsp.ApplicationLoadBalancedEc2Service,
  cluster: ecs.Cluster,
  Props?: StackProps,
}

export class ServicePipelineConstruct extends Construct {

  private pipelineConfig: PipelineConfig;
  private scope: Stack;
  private config: PipelineConfig;
  
  constructor(scope: Stack, id: string, config: PipelineConfig) {
    super(scope, id);
    
    this.pipelineConfig = config;
    this.scope = scope;
    this.config = config;

    //Code Pipeline
    const pipeline = new Pipeline(this, 'Pipeline', {pipelineName: config.pipelineName,});

    //Source Stage
    const sourceOutput = new Artifact();
    const sourceAction = this.getGitHubSourceAction(config.repo, sourceOutput);
    pipeline.addStage({stageName: 'Source', actions: [sourceAction],})

    //Build Stage
    const buildOutput = new Artifact();
    const buildAction = this.getCodeBuildAction(sourceOutput, buildOutput);
    pipeline.addStage({stageName: 'Build', actions: [buildAction],})
    
    //Deploy Beta Stage
    //const deployBetaAction = this.getEcsBetaDeployActioin(buildOutput);
    //pipeline.addStage({stageName: 'Deploy-Beta', actions: [deployBetaAction],})

    /* 검증 필요
    //Approve Stage
    const manualApprovalAction = this.getEcsApproveActioin();
    pipeline.addStage({stageName: 'Manual approval', actions: [manualApprovalAction],})

    //Deploy Beta Stage
    const deployProdAction = this.getEcsDeployActioin(buildOutput);
    pipeline.addStage({stageName: 'Deploy-Beta', actions: [deployProdAction],})
    */
  }
  
  private getGitHubSourceAction = (repo:IRepo, output:Artifact) : GitHubSourceAction => {
    return new GitHubSourceAction({
        actionName: 'GitHubSourceAction',
        owner: repo.gitRepo.owner,
        output: output,
        repo: repo.gitRepo.repoName,
        branch: repo.gitRepo.branch,
        oauthToken: SecretValue.secretsManager(repo.gitRepo.tokenName),
    });
  }

  private getCodeBuildAction = (input: Artifact, output: Artifact): CodeBuildAction => {
    return new CodeBuildAction({
        actionName: "BuildAction",
        input: input,
        project: this.createCodeBuildProject(),
        outputs: [output]
    });
  }

  private getEcsBetaDeployActioin = (buildArtifact: Artifact) : CodeDeployEcsDeployAction => {
    if(this.config.cluster.autoscalingGroup == undefined) throw 'asg error';
    const asg = this.config.cluster.autoscalingGroup
    const application = new EcsApplication(this, 'deployapplication', {
      applicationName: this.config.clusterName
    })
    const deploymentGroup = new ServerDeploymentGroup(this, 'deploygroup', {
      application,
      deploymentGroupName: 'MyDeploymentGroup',
      autoScalingGroups: [asg],
      installAgent: true,
      autoRollback: {
        failedDeployment: true, 
        stoppedDeployment: true,
      },
    })
    /*
    const deploymentGroup = EcsDeploymentGroup.fromEcsDeploymentGroupAttributes(this, 'ecsdeploygroup', {
      deploymentGroupName: `${this.config.serviceName}`,
      application: application,
    })
    */
    return new CodeDeployEcsDeployAction({
      actionName: `DeployAction`,
      deploymentGroup : deploymentGroup,
      taskDefinitionTemplateInput: buildArtifact,
      appSpecTemplateInput: buildArtifact,
      containerImageInputs: [{
        input: buildArtifact,
      }],
    });
    /*
    return new EcsDeployAction({
        actionName: `DeployAction`,
        service: this.pipelineConfig.serviceBeta,
        input: buildArtifact,
        deploymentTimeout: Duration.minutes(60),
    });
    */
  }
                                                  
  private getEcsApproveActioin = () : ManualApprovalAction => {

    const action = new ManualApprovalAction({
        actionName: `DeployAction`,
    });

    const role = iam.Role.fromRoleArn(this, 'Admin', Arn.format({ service: 'iam', resource: 'role', resourceName: 'Admin' }));
    action.grantManualApproval(role);

    return action;
  }

  private createCodeBuildProject = (): PipelineProject => {
    const codeBuildProject = new PipelineProject(this, `${this.pipelineConfig.pipelineName}-CodebuildProject`, {
        projectName: `${this.pipelineConfig.pipelineName}-CodebuildProject`,
        environment: {
            buildImage: LinuxBuildImage.STANDARD_5_0,
            privileged: true,
        },
        environmentVariables: this.getEnvironmentVariables(),
        buildSpec: BuildSpec.fromObject(buildSpecContent),
        cache: Cache.local(LocalCacheMode.DOCKER_LAYER, LocalCacheMode.CUSTOM),
    });

    codeBuildProject.role?.addManagedPolicy(
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryPowerUser')
    );

    /*
    codeBuildProject.role?.addManagedPolicy(
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryFullAccess')
    );
    */

    return codeBuildProject;
  }

  private getEnvironmentVariables = () => {
    return {
        ACCOUNT_ID: {
            value: this.scope.account
        },
        ACCOUNT_REGION: {
            value: this.scope.region
        },
        ECR_REPO: {
            value:  this.config.repo.ecrRepo.repositoryUri
        },
        IMAGE_NAME: {
            value: this.config.repo.ecrRepo.repositoryName
        },
    };
}

  
}
  