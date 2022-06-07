
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr'
import { Construct } from 'constructs';

export type GitRepo = {
  owner: string,
  repoName: string,
  branch: string,
  tokenName: string,
}

export type RepoConstructProps = {
  serviceName: string,
  gitRepo: GitRepo
  ecrLoad: boolean,
} 

export interface IRepo {
  gitRepo: GitRepo,
  ecrRepo: ecr.IRepository,
}

export class RepoConstruct extends Construct implements IRepo{
  public gitRepo: GitRepo;
  public ecrRepo: ecr.IRepository;

  constructor(scope: Construct, id: string, props: RepoConstructProps){
    super(scope, id);

    this.gitRepo = props.gitRepo;
    
    if(props.ecrLoad){
      this.ecrRepo = ecr.Repository.fromRepositoryName(this, `ecr-repo`, props.serviceName.toLowerCase());
    }
    else{
      this.ecrRepo = new ecr.Repository(this, 'ecr-repo', {
        repositoryName: props.serviceName.toLowerCase(),
        removalPolicy: RemovalPolicy.DESTROY,
      }); 
    }
    
  }

}