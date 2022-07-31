export type GitRepo = {
  owner: string,
  repoName: string,
  branch: string,
  tokenName: string,
}

export const INFRA_GIT_REPO:GitRepo = { 
  owner: 'f-lab-edu',
  repoName: 'chan-cdk', 
  branch: 'master',
  tokenName: 'github-token',
};

export const CUSTOMER_GIT_REPO:GitRepo  = { 
  owner: 'f-lab-edu',
  repoName: 'chan-customer', 
  branch: 'master',
  tokenName: 'github-token',
};

export const SELLER_GIT_REPO:GitRepo  = { 
  owner: 'f-lab-edu',
  repoName: 'chan-seller', 
  branch: 'main',
  tokenName: 'github-token',
};

export const LOGISTICS_GIT_REPO:GitRepo  = { 
  owner: 'f-lab-edu',
  repoName: 'chan-logistics', 
  branch: 'main',
  tokenName: 'github-token',
};
