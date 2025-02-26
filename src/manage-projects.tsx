import { ActionPanel, List, Action, Image, showToast, Toast, Icon, ImageMask, environment } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL } from "./lib/constants";
import { ErrorResponse } from "./lib/types";
import ProjectBuilds from "./views/ProjectBuilds";
import ProjectTimeline from "./views/ProjectTimeline";
import ProjectSubmissions from "./views/ProjectSubmissions";
import ProjectUpdates from "./views/ProjectUpdates";
import AccountPicker from "./components/AccountPicker";
import { ProjectsResponse } from "./lib/types/projects.types";
import AuthWrapper from "./components/AuthWrapper";
import useAuth from "./hooks/useAuth";
import { dummyProjects } from "./lib/dummy";

export default function Command() {
  const [accountName, setAccountName] = useState("");

  const { authHeaders } = useAuth();

  const ProjectsPayload = JSON.stringify([
    {
      operationName: "AppsPaginatedQuery",
      variables: {
        first: 10,
        accountName: accountName,
        filter: {
          sortByField: "LATEST_ACTIVITY_TIME",
        },
      },
      query:
        "query AppsPaginatedQuery($accountName: String!, $after: String, $first: Int, $before: String, $last: Int, $filter: AccountAppsFilterInput) {\n  account {\n    byName(accountName: $accountName) {\n      id\n      appsPaginated(\n        after: $after\n        first: $first\n        before: $before\n        last: $last\n        filter: $filter\n      ) {\n        edges {\n          node {\n            ...AppDataWithRepo\n            __typename\n          }\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          hasPreviousPage\n          startCursor\n          endCursor\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment AppDataWithRepo on App {\n  ...AppData\n  githubRepository {\n    metadata {\n      githubRepoName\n      githubRepoOwnerName\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment AppData on App {\n  __typename\n  id\n  icon {\n    url\n    primaryColor\n    __typename\n  }\n  iconUrl\n  fullName\n  name\n  slug\n  ownerAccount {\n    name\n    id\n    __typename\n  }\n  githubRepository {\n    githubRepositoryUrl\n    __typename\n  }\n  lastDeletionAttemptTime\n}",
    },
  ]);
  const { isLoading, data } = useFetch(BASE_URL, {
    body: ProjectsPayload,
    method: "post",
    headers: authHeaders,
    execute: accountName ? true : false,
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectsResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Projects", message: errorMessages, style: Toast.Style.Failure });
        return [];
      }

      return data[0].data.account.byName.appsPaginated.edges;
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

  return (
    <AuthWrapper>
      <List
        isLoading={isLoading}
        navigationTitle="Expo Projects"
        searchBarPlaceholder="Search Projects"
        searchBarAccessory={<AccountPicker onPick={(acc) => setAccountName(acc.name)} />}
      >
        {data ? (
          <>
            {data.map((project) => (
              <List.Item
                key={project.node.id}
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
                      icon={Icon.Leaf}
                    />
                    <Action.Push
                      title="View Updates"
                      target={<ProjectUpdates appFullName={project.node.fullName} />}
                      icon={Icon.Layers}
                    />
                    <Action.OpenInBrowser
                      title="Open on Expo"
                      url={`https://expo.dev/accounts/${project.node.fullName}`}
                      icon={{
                        source: "expo.png",
                        mask: ImageMask.Circle,
                      }}
                    />
                    {project.node.githubRepository && (
                      <Action.OpenInBrowser
                        title="Open on GitHub"
                        url={project.node.githubRepository}
                        icon={{
                          source: "github.png",
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
    </AuthWrapper>
  );
}
