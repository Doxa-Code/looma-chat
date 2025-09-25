export {};

declare global {
  interface Window {
    fbAsyncInit?: () => void;
  }

  interface FBInitParams {
    appId: string;
    autoLogAppEvents?: boolean;
    xfbml?: boolean;
    version: string;
  }

  interface FB {
    init(params: FBInitParams): void;
    getLoginStatus(callback: (response: any) => void): void;
    login(
      callback: (response: any) => void,
      options?: {
        config_id: string;
        response_type: "code";
        override_default_response_type: boolean;
        extras: any;
      }
    ): void;
    logout(callback: (response: any) => void): void;
    api(
      path: string,
      method: string,
      params: any,
      callback: (response: any) => void
    ): void;
  }

  var FB: FB;
}
