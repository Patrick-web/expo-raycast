import { showToast, Toast, ActionPanel, Action, Detail, ListItem, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { getAuthHeaders } from "../lib/utils";
import { Build, BuildDetailsResponse } from "../lib/types/build-details.types";
import generateBuildMarkdown from "../lib/markdown/generateBuildMarkdown";

export default function BuildDetails({ buildId }: { buildId: string }) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);

  const BuildDetailsPayload = JSON.stringify([
    {
      operationName: "BuildQuery",
      variables: {
        buildId: buildId,
      },
      query:
        "query BuildQuery($buildId: ID!) {\n  builds {\n    byId(buildId: $buildId) {\n      ...Build\n      deployment {\n        id\n        runtime {\n          ...RuntimeBasicInfo\n          __typename\n        }\n        channel {\n          ...UpdateChannelBasicInfo\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment Build on Build {\n  __typename\n  id\n  platform\n  status\n  app {\n    id\n    fullName\n    slug\n    name\n    iconUrl\n    githubRepository {\n      githubRepositoryUrl\n      __typename\n    }\n    ownerAccount {\n      name\n      __typename\n    }\n    __typename\n  }\n  artifacts {\n    applicationArchiveUrl\n    buildArtifactsUrl\n    xcodeBuildLogsUrl\n    __typename\n  }\n  distribution\n  logFiles\n  metrics {\n    buildWaitTime\n    buildQueueTime\n    buildDuration\n    __typename\n  }\n  initiatingActor {\n    id\n    displayName\n    ... on UserActor {\n      username\n      fullName\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n    __typename\n  }\n  createdAt\n  enqueuedAt\n  provisioningStartedAt\n  workerStartedAt\n  completedAt\n  updatedAt\n  expirationDate\n  sdkVersion\n  runtime {\n    id\n    version\n    __typename\n  }\n  updateChannel {\n    id\n    name\n    __typename\n  }\n  buildProfile\n  appVersion\n  appBuildVersion\n  gitCommitHash\n  gitCommitMessage\n  isGitWorkingTreeDirty\n  message\n  resourceClassDisplayName\n  gitRef\n  projectRootDirectory\n  githubRepositoryOwnerAndName\n  projectMetadataFileUrl\n  childBuild {\n    id\n    buildMode\n    __typename\n  }\n  priority\n  queuePosition\n  initialQueuePosition\n  estimatedWaitTimeLeftSeconds\n  submissions {\n    id\n    status\n    canRetry\n    __typename\n  }\n  canRetry\n  retryDisabledReason\n  maxRetryTimeMinutes\n  buildMode\n  customWorkflowName\n  isWaived\n  developmentClient\n  selectedImage\n  customNodeVersion\n  isForIosSimulator\n  resolvedEnvironment\n}\n\nfragment RuntimeBasicInfo on Runtime {\n  __typename\n  id\n  version\n}\n\nfragment UpdateChannelBasicInfo on UpdateChannel {\n  __typename\n  id\n  name\n  branchMapping\n  createdAt\n  updatedAt\n  isPaused\n}",
    },
  ]);

  const { isLoading, data } = useFetch(BASE_URL, {
    body: BuildDetailsPayload,
    method: "post",
    headers: headers || {},
    execute: headers === null ? false : true,
    parseResponse: async (resp) => {
      const data = (await resp.json()) as BuildDetailsResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Project Builds", message: errorMessages, style: Toast.Style.Failure });
        return [];
      }

      return data[0].data.builds.byId;
    },
    onData: (data) => {
      console.log(data);
    },
    onError: (error) => {
      console.log(error);
      showToast({
        title: "Error fetching project builds",
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

  function getExpoLink(build: Build) {
    const link = `https://expo.dev/accounts/${build.app.ownerAccount?.name}/projects/${build.app.name}/${build.__typename}s/${build.id}`;
    return link.toLowerCase();
  }

  if (!data) {
    <List.EmptyView title="No Builds Found" />;
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Build Details"
      markdown={data ? generateBuildMarkdown(data) : ""}
      actions={
        <ActionPanel>
          {/* <Action.OpenInBrowser title="View on Expo" url={getExpoLink(data)} icon={"expo.png"} /> */}
        </ActionPanel>
      }
    />
  );
}
