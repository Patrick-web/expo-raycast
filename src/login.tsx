import { Form, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import axios from "axios";
import { BASE_URL, baseHeaders } from "./lib/constants";
import { AccountResponse, ErrorResponse } from "./lib/types";
import { getAuthHeaders } from "./lib/utils";

interface Payload {
  email: string;
  password: string;
}

interface SuccessLogin {
  data: {
    sessionSecret: string;
  };
}

type LoginResponse = SuccessLogin | ErrorResponse;

export default function Command() {
  async function getAccount() {
    const toast = await showToast({ title: "Setting up...", style: Toast.Style.Animated });

    const data = JSON.stringify([
      {
        operationName: "CurrentUserActorAnalytics",
        variables: {},
        query:
          "query CurrentUserActorAnalytics {\n  __typename\n  meUserActor {\n    ...CurrentUserActorAnalyticsData\n    __typename\n  }\n}\n\nfragment CurrentUserActorAnalyticsData on UserActor {\n  __typename\n  id\n  username\n  ... on User {\n    email\n    __typename\n  }\n}",
      },
    ]);

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: BASE_URL,
      headers: await getAuthHeaders(),
      data: data,
    };

    try {
      const resp = await axios.request<AccountResponse>(config);

      if ("errors" in resp.data) {
        const errorMessages = (resp.data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Login Failed", message: errorMessages, style: Toast.Style.Failure });
      } else {
        const accounts = resp.data.map((acc) => ({
          email: acc.data.meUserActor.email,
          username: acc.data.meUserActor.username,
        }));

        LocalStorage.setItem("accounts", JSON.stringify(accounts));

        toast.style = Toast.Style.Success;
        toast.title = "All setup";
        toast.message = "You can use the other commands";
      }
    } catch (error) {
      console.log(error);
      showToast({ title: "Error setting up", message: (error as Error)?.message || "", style: Toast.Style.Failure });
    }
  }

  const { handleSubmit } = useForm<Payload>({
    onSubmit: async (values) => {
      try {
        const resp = await axios.post<LoginResponse>(
          "https://api.expo.dev/v2/auth/loginAsync",
          {
            username: values.email,
            password: values.password,
          },
          {
            headers: baseHeaders,
          },
        );
        console.log(resp.data);

        // check if succesful response or failed
        if ("data" in resp.data) {
          showToast({ title: "Logged In", message: "", style: Toast.Style.Success });
          getAccount(resp.data.data.sessionSecret);
          LocalStorage.setItem("sessionSecret", resp.data.data.sessionSecret);
        } else {
          const errorMessages = (resp.data as ErrorResponse).errors.map((error) => error.message).join(", ");
          showToast({ title: "Login Failed", message: errorMessages, style: Toast.Style.Failure });
        }
      } catch (error) {
        console.log(error);
        showToast({ title: "Error logging in", style: Toast.Style.Failure });
      }
    },
    validation: {
      email: FormValidation.Required,
      password: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Log into Expo Account"
    >
      <Form.TextField id="email" title="Email" placeholder="john@doe.com" defaultValue="" />
      <Form.PasswordField id="password" title="Password" placeholder="******" defaultValue="" />
    </Form>
  );
}
