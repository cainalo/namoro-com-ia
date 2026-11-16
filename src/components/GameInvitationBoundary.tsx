import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * Optional realtime features must not take down the authenticated app shell.
 * When this boundary catches a render error, the rest of the app stays usable.
 */
export class GameInvitationBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "O painel global de convites foi isolado após uma falha. O restante do Morados continua disponível.",
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
