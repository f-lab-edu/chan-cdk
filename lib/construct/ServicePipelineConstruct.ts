import { Construct } from 'constructs';
import { Arn, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { Pipeline, Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CodeBuildAction, CodeDeployEcsDeployAction, EcsDeployAction, GitHubSourceAction, ManualApprovalAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { BuildSpec, Cache, LinuxBuildImage, LocalCacheMode, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { EcsApplication, ServerDeploymentGroup } from 'aws-cdk-lib/aws-codedeploy';
import buildSpecContent from '../../config/buildSpecContent';
import { GitRepo } from '../../config/repositoryConfig';

export interface PipelineConfig{
  serviceName: string,
  gitRepo: GitRepo,
  ecrRepo: ecr.IRepository,
  stackProps?: StackProps,
}

export class ServicePipelineConstructStack extends Stack {

  private readonly config:PipelineConfig;

  constructor(scope: Construct, id: string, config: PipelineConfig) {
    super(scope, id, config.stackProps);
    
    this.config = config;
    
    //Code Pipeline
    const pipeline = new Pipeline(this, 'Pipeline', {pipelineName: config.serviceName});

    //Source Stage
    const sourceOutput = new Artifact();
    const sourceAction = this.getGitHubSourceAction(config.gitRepo, sourceOutput);
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
  
  private getGitHubSourceAction = (repo:GitRepo, output:Artifact) : GitHubSourceAction => {
    return new GitHubSourceAction({
        actionName: 'GitHubSourceAction',
        owner: repo.owner,
        output: output,
        repo: repo.repoName,
        branch: repo.branch,
        oauthToken: SecretValue.secretsManager(repo.tokenName),
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

  private getEcsBetaDeployActioin = (buildArtifact: Artifact) => {
    /*
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

    const deploymentGroup = EcsDeploymentGroup.fromEcsDeploymentGroupAttributes(this, 'ecsdeploygroup', {
      deploymentGroupName: `${this.config.serviceName}`,
      application: application,
    })
    */
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
    const codeBuildProject = new PipelineProject(this, `${this.config.serviceName}-Codebuild`, {
        projectName: `${this.config.serviceName}-Codebuild`,
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
            value: this.account
        },
        ACCOUNT_REGION: {
            value: this.region
        },
        ECR_REPO: {
            value:  this.config.ecrRepo.repositoryUri
        },
        IMAGE_NAME: {
            value: this.config.ecrRepo.repositoryName
        },
    };
}

  
}
  