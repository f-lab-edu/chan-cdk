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

export const CUSTOMER_GIT_REPO:GitRepo  = { 
  owner: 'revino',
  repoName: 'chan_customer_test', 
  branch: 'main',
  tokenName: 'github-token',
};

export const SELLER_GIT_REPO:GitRepo  = { 
  owner: 'revino',
  repoName: 'chan_seller_test', 
  branch: 'main',
  tokenName: 'github-token',
};

