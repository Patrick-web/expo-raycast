import { showToast, Toast, List, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { changeCase, getAuthHeaders } from "../lib/utils";
import { EnvironmentVariablesItem, ProjectEnvsResponse } from "../lib/types/project-envs.types";
import EditEnv from "./EditEnvs";

export default function ProjectEnvs({ appFullName }: { appFullName: string }) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);

  const ProjectEnvsPayload = JSON.stringify([
    {
      operationName: "GetAppEnvironmentVariables",
      variables: {
        includeFileContent: false,
        fullName: appFullName,
      },
      query:
        "query GetAppEnvironmentVariables($fullName: String!, $environment: EnvironmentVariableEnvironment, $filterNames: [String!], $includeFileContent: Boolean = false) {\n  app {\n    byFullName(fullName: $fullName) {\n      id\n      environmentVariables(environment: $environment, filterNames: $filterNames) {\n        ...EnvironmentVariableData\n        linkedEnvironments(appFullName: $fullName)\n        valueWithFileContent: value(includeFileContent: $includeFileContent) @include(if: $includeFileContent)\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment EnvironmentVariableData on EnvironmentVariable {\n  id\n  name\n  scope\n  value\n  environments\n  visibility\n  createdAt\n  updatedAt\n  type\n  isGlobal\n  fileName\n  apps {\n    id\n    name\n    slug\n    ownerAccount {\n      id\n      name\n      __typename\n    }\n    __typename\n  }\n  __typename\n}",
    },
  ]);

  const { isLoading, data, revalidate } = useFetch(BASE_URL, {
    body: ProjectEnvsPayload,
    method: "post",
    headers: headers || {},
    execute: headers === null ? false : true,
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectEnvsResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({
          title: "Error Fetching Project Enviroment Variables",
          message: errorMessages,
          style: Toast.Style.Failure,
        });
        return [];
      }

      return data[0].data.app.byFullName.environmentVariables || [];
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

  function getEnvString(envs: EnvironmentVariablesItem[]) {
    return envs.map((env) => `${env.name}=${env.value}`).join("\n");
  }

  useEffect(() => {
    async function fetchHeaders() {
      const authHeaders = await getAuthHeaders();
      setHeaders(authHeaders);
    }
    fetchHeaders();
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Enviroment Variables">
      {data ? (
        <>
          {data.map((env) => (
            <List.Item
              id={env.id}
              key={env.id}
              icon={{
                source:
                  env.visibility === "SECRET"
                    ? Icon.Lock
                    : env.visibility === "SENSITIVE"
                      ? Icon.EyeDisabled
                      : Icon.Text,
              }}
              title={env.name}
              subtitle={env.value || "*****"}
              accessories={[
                ...(env.isGlobal ? [{ tag: { value: "Global", color: Color.Blue } }] : []),
                {
                  tag: {
                    value: env.visibility,
                    color:
                      env.visibility === "PUBLIC"
                        ? Color.Green
                        : env.visibility === "SECRET"
                          ? Color.Red
                          : Color.Magenta,
                  },
                },
                {
                  tag: { value: env.environments.map((en) => changeCase(en, "sentence")).join(" ⋅ ") },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy All" content={getEnvString(data)} icon={Icon.CopyClipboard} />
                  <Action.CopyToClipboard title="Copy" content={`${env.name}=${env.value}`} icon={Icon.CopyClipboard} />
                  {env.visibility !== "SECRET" && env.scope === "PROJECT" && (
                    <Action.Push
                      title="Edit"
                      icon={Icon.Pencil}
                      target={<EditEnv env={env} refreshEnvs={revalidate} />}
                    />
                  )}
                  <Action title="Delete" style={Action.Style.Destructive} onAction={() => {}} icon={Icon.Trash} />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView title="No Enviroment Variables Found" />
      )}
    </List>
  );
}
