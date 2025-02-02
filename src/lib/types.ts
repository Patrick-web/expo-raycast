//common types
export interface ErrorResponse {
  errors: ErrorsItem[];
}

export interface ErrorsItem {
  code: string;
  message: string;
  isTransient: boolean;
  requestId: string;
}

// login command
export type AccountResponse = AccountSuccess[] | ErrorResponse;

interface AccountSuccess {
  data: {
    __typename: string;
    meUserActor: {
      __typename: string;
      id: string;
      username: string;
      email: string;
    };
  };
}

// view projects
export type ProjectsResponse = ProjectsSuccess | ErrorResponse;

export type ProjectsSuccess = ProjectsSuccessItem[];

interface ProjectsSuccessItem {
  data: {
    account: {
      byName: {
        id: string;
        appsPaginated: {
          edges: {
            node: Project;
            __typename: string;
          }[];
          pageInfo: {
            hasNextPage: boolean;
            hasPreviousPage: boolean;
            startCursor: string;
            endCursor: string;
            __typename: string;
          };
          __typename: string;
        };
        __typename: string;
      };
      __typename: string;
    };
  };
}

export interface Project {
  __typename: string;
  id: string;
  icon: null;
  iconUrl: string;
  fullName: string;
  name: string;
  slug: string;
  ownerAccount: {
    name: string;
    id: string;
    __typename: string;
  };
  githubRepository: null;
  lastDeletionAttemptTime: null;
}
