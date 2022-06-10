export type GitRepo = {
  owner: string,
  repoName: string,
  branch: string,
  tokenName: string,
}

export const INFRA_GIT_REPO:GitRepo = { 
  owner: 'revino',
  repoName: 'chan_ias_test', 
  branch: 'main',
  tokenName: 'github-token',
};

export const ORDER_GIT_REPO:GitRepo  = { 
  owner: 'revino',
  repoName: 'chan_Order_Sample', 
  branch: 'main',
  tokenName: 'github-token',
};


