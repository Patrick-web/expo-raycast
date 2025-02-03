import { ActionPanel, Detail, List, Action, Image, showToast, Toast, Icon, ImageMask, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { BASE_URL, ExpoIcon, GithubIcon } from "./lib/constants";
import { changeCase, getAuthHeaders } from "./lib/utils";
import { ErrorResponse, ProjectActivity, ProjectsResponse, ProjectTimelineResponse } from "./lib/types";

const ProjectsPayload = JSON.stringify([
  {
    operationName: "AppsPaginatedQuery",
    variables: {
      first: 10,
      accountName: "pntx",
      filter: {
        sortByField: "LATEST_ACTIVITY_TIME",
      },
    },
    query:
      "query AppsPaginatedQuery($accountName: String!, $after: String, $first: Int, $before: String, $last: Int, $filter: AccountAppsFilterInput) {\n  account {\n    byName(accountName: $accountName) {\n      id\n      appsPaginated(\n        after: $after\n        first: $first\n        before: $before\n        last: $last\n        filter: $filter\n      ) {\n        edges {\n          node {\n            ...AppDataWithRepo\n            __typename\n          }\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          hasPreviousPage\n          startCursor\n          endCursor\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment AppDataWithRepo on App {\n  ...AppData\n  githubRepository {\n    metadata {\n      githubRepoName\n      githubRepoOwnerName\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment AppData on App {\n  __typename\n  id\n  icon {\n    url\n    primaryColor\n    __typename\n  }\n  iconUrl\n  fullName\n  name\n  slug\n  ownerAccount {\n    name\n    id\n    __typename\n  }\n  githubRepository {\n    githubRepositoryUrl\n    __typename\n  }\n  lastDeletionAttemptTime\n}",
  },
]);

export default function Command() {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);

  const { isLoading, data } = useFetch(BASE_URL, {
    body: ProjectsPayload,
    method: "post",
    headers: headers || {},
    execute: headers === null ? false : true,
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectsResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Projects", message: errorMessages, style: Toast.Style.Failure });
        return [];
      }

      return data[0].data.account.byName.appsPaginated.edges;
    },
    onData: (data) => {
      console.log(data);
    },
    onError: (error) => {
      console.log(error);
      showToast({
        title: "Error fetching projects",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: [],
  });

  useEffect(() => {
    async function fetchHeaders() {
      const authHeaders = await getAuthHeaders();
      setHeaders(authHeaders);
    }
    fetchHeaders();
  }, []);

  return (
    <List isLoading={isLoading}>
      {data ? (
        <>
          {data.map((project) => (
            <List.Item
              icon={
                project.node.iconUrl
                  ? {
                      source: project.node.iconUrl,
                      mask: Image.Mask.Circle,
                    }
                  : Icon.MemoryChip
              }
              title={project.node.name}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Activity"
                    target={<ProjectTimeline appFullName={project.node.fullName} />}
                    icon={Icon.Box}
                  />
                  <Action.OpenInBrowser
                    title="Open on Expo"
                    url={`https://expo.dev/accounts/${project.node.fullName}`}
                    icon={{
                      source: ExpoIcon,
                      mask: ImageMask.Circle,
                    }}
                  />
                  {project.node.githubRepository && (
                    <Action.OpenInBrowser
                      title="Open on GitHub"
                      url={project.node.githubRepository}
                      icon={{
                        source: GithubIcon,
                        mask: ImageMask.Circle,
                      }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView />
      )}
    </List>
  );
}

function ProjectTimeline({ appFullName }: { appFullName: string }) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);

  const ProjectTimelinePayload = JSON.stringify([
    {
      operationName: "AppTimelineActivityQuery",
      variables: {
        appFullName: appFullName,
        first: 10,
        filter: {
          types: ["BUILD", "SUBMISSION", "UPDATE", "WORKFLOW_RUN", "WORKER"],
        },
      },
      query:
        "query AppTimelineActivityQuery($appFullName: String!, $first: Int!, $filter: TimelineActivityFilterInput, $after: String) {\n  app {\n    byFullName(fullName: $appFullName) {\n      id\n      timelineActivity(first: $first, filter: $filter, after: $after) {\n        edges {\n          cursor\n          node {\n            __typename\n            ...TableBuild\n            ...TableUpdate\n            ...TableSubmission\n            ...TableWorkflowRun\n            ...TableWorker\n          }\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          startCursor\n          endCursor\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment TableBuild on Build {\n  id\n  __typename\n  activityTimestamp\n  createdAt\n  actor {\n    id\n    __typename\n    displayName\n    ... on UserActor {\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n  app {\n    ...AppData\n    __typename\n  }\n  initiatingActor {\n    id\n    displayName\n    ... on UserActor {\n      username\n      fullName\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n    __typename\n  }\n  buildChannel: updateChannel {\n    id\n    name\n    __typename\n  }\n  buildPlatform: platform\n  buildStatus: status\n  buildRuntime: runtime {\n    id\n    version\n    __typename\n  }\n  buildGitCommitHash: gitCommitHash\n  buildGitCommitMessage: gitCommitMessage\n  buildIsGitWorkingTreeDirty: isGitWorkingTreeDirty\n  message\n  expirationDate\n  distribution\n  buildMode\n  customWorkflowName\n  buildProfile\n  gitRef\n  appBuildVersion\n  appVersion\n  metrics {\n    buildDuration\n    __typename\n  }\n  developmentClient\n  isForIosSimulator\n  deployment {\n    id\n    runtime {\n      ...RuntimeBasicInfo\n      __typename\n    }\n    channel {\n      ...UpdateChannelBasicInfo\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment AppData on App {\n  __typename\n  id\n  icon {\n    url\n    primaryColor\n    __typename\n  }\n  iconUrl\n  fullName\n  name\n  slug\n  ownerAccount {\n    name\n    id\n    __typename\n  }\n  githubRepository {\n    githubRepositoryUrl\n    __typename\n  }\n  lastDeletionAttemptTime\n}\n\nfragment RuntimeBasicInfo on Runtime {\n  __typename\n  id\n  version\n}\n\nfragment UpdateChannelBasicInfo on UpdateChannel {\n  __typename\n  id\n  name\n  branchMapping\n  createdAt\n  updatedAt\n  isPaused\n}\n\nfragment TableUpdate on Update {\n  ...UpdateBasicInfo\n  ...UpdateActor\n  app {\n    ...AppData\n    __typename\n  }\n  branch {\n    ...UpdateBranchBasicInfo\n    __typename\n  }\n  __typename\n}\n\nfragment UpdateBasicInfo on Update {\n  __typename\n  id\n  group\n  message\n  createdAt\n  updatedAt\n  activityTimestamp\n  isRollBackToEmbedded\n  codeSigningInfo {\n    keyid\n    __typename\n  }\n  branchId\n  updateRuntime: runtime {\n    id\n    version\n    __typename\n  }\n  updatePlatform: platform\n  updateGitCommitHash: gitCommitHash\n  updateIsGitWorkingTreeDirty: isGitWorkingTreeDirty\n  manifestFragment\n  app {\n    id\n    fullName\n    slug\n    __typename\n  }\n}\n\nfragment UpdateActor on Update {\n  __typename\n  id\n  actor {\n    __typename\n    id\n    displayName\n    ... on UserActor {\n      profilePhoto\n      fullName\n      username\n      bestContactEmail\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n}\n\nfragment UpdateBranchBasicInfo on UpdateBranch {\n  __typename\n  id\n  name\n}\n\nfragment TableSubmission on Submission {\n  id\n  __typename\n  activityTimestamp\n  createdAt\n  initiatingActor {\n    id\n    __typename\n    displayName\n    ... on UserActor {\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n  app {\n    ...AppData\n    __typename\n  }\n  submittedBuild {\n    id\n    appVersion\n    __typename\n  }\n  submissionPlatform: platform\n  submissionStatus: status\n}\n\nfragment TableWorkflowRun on WorkflowRun {\n  id\n  __typename\n  status\n  name\n  activityTimestamp\n  createdAt\n  updatedAt\n  workflow {\n    name\n    fileName\n    app {\n      ...AppData\n      __typename\n    }\n    __typename\n  }\n  actor {\n    id\n    __typename\n    displayName\n    ... on UserActor {\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n  gitCommitHash\n  gitCommitMessage\n  requestedGitRef\n  pullRequestNumber\n}\n\nfragment TableWorker on WorkerDeployment {\n  id\n  __typename\n  devDomainName\n  deploymentIdentifier\n  activityTimestamp\n  createdAt\n  url\n  deploymentDomain\n  subdomain\n  actor {\n    id\n    __typename\n    displayName\n    ... on UserActor {\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n  app {\n    ...AppData\n    __typename\n  }\n}",
    },
  ]);

  const { isLoading, data } = useFetch(BASE_URL, {
    body: ProjectTimelinePayload,
    method: "post",
    headers: headers || {},
    execute: headers === null ? false : true,
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectTimelineResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Project Activity", message: errorMessages, style: Toast.Style.Failure });
        return [];
      }

      return data[0].data.app.byFullName?.timelineActivity.edges || [];
    },
    onData: (data) => {
      console.log(data);
    },
    onError: (error) => {
      console.log(error);
      showToast({
        title: "Error fetching projects",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: [],
  });

  useEffect(() => {
    async function fetchHeaders() {
      const authHeaders = await getAuthHeaders();
      setHeaders(authHeaders);
    }
    fetchHeaders();
  }, []);

  function setTintColor(activity: ProjectActivity) {
    if (activity.__typename === "Build") {
      if (activity.buildStatus === "FINISHED") {
        return Color.Green;
      }
      if (activity.buildStatus === "FAILED" || activity.buildStatus === "ERRORED") {
        return Color.Red;
      }
      return Color.Blue;
    }
    if (activity.__typename === "Submission") {
      if (activity.submissionStatus === "FINISHED") {
        return Color.Green;
      }
      if (activity.submissionStatus === "ERRORED") {
        return Color.Red;
      }
      return Color.Blue;
    }
    return undefined;
  }

  function getStatusTag(activity: ProjectActivity) {
    return changeCase(
      activity.buildStatus || activity.submissionStatus || activity.branch?.name + "🎋" || "",
      "sentence",
    );
  }

  function getTitle(activity: ProjectActivity) {
    const platform = changeCase(
      activity.buildPlatform || activity.submissionPlatform || activity.updatePlatform || "",
      "upper",
    );
    const activityType = activity.__typename;

    return `${platform} ${activityType}`;
  }

  function getExpoLink(activity: ProjectActivity) {
    const link = `https://expo.dev/accounts/${activity.app.ownerAccount?.name}/projects/${activity.app.name}/${activity.__typename}s/${activity.id}`;
    return link.toLowerCase();
  }

  return (
    <List isLoading={isLoading}>
      {data ? (
        <>
          {data.map((project) => (
            <List.Item
              id={project.node.id}
              icon={{
                source:
                  project.node.__typename === "Build"
                    ? Icon.HardDrive
                    : project.node.__typename === "Update"
                      ? Icon.Cloud
                      : Icon.Store,
                tintColor: setTintColor(project.node),
              }}
              title={getTitle(project.node)}
              accessories={[
                { date: new Date(project.node.activityTimestamp) },
                { text: new Date(project.node.activityTimestamp).toLocaleTimeString() },
                {
                  tag: {
                    value: getStatusTag(project.node),
                    color: setTintColor(project.node),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Build" target={<Detail markdown="# Hey! 👋" />} icon={Icon.Box} />
                  <Action.OpenInBrowser
                    title="View on Expo"
                    url={getExpoLink(project.node)}
                    icon={{
                      source: ExpoIcon,
                      mask: ImageMask.Circle,
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView />
      )}
    </List>
  );
}
