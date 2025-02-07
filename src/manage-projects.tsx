import { ActionPanel, List, Action, Image, showToast, Toast, Icon, ImageMask } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { BASE_URL, ExpoIcon, GithubIcon } from "./lib/constants";
import { getAuthHeaders } from "./lib/utils";
import { ErrorResponse, ProjectsResponse } from "./lib/types";
import ProjectBuilds from "./views/ProjectBuilds";
import ProjectTimeline from "./views/ProjectTimeline";
import ProjectSubmissions from "./views/ProjectSubmissions";
import ProjectUpdates from "./views/ProjectUpdates";

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
    <List isLoading={isLoading} navigationTitle="Expo Projects" searchBarPlaceholder="Search Projects">
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
                    icon={Icon.LineChart}
                  />
                  <Action.Push
                    title="View Builds"
                    target={<ProjectBuilds appFullName={project.node.fullName} />}
                    icon={Icon.HardDrive}
                  />
                  <Action.Push
                    title="View Submissions"
                    target={<ProjectSubmissions appFullName={project.node.fullName} />}
                    icon={Icon.Store}
                  />
                  <Action.Push
                    title="View Updates"
                    target={<ProjectUpdates appFullName={project.node.fullName} />}
                    icon={Icon.Cloud}
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
