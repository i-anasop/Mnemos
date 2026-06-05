import WorkspaceProviders from './providers';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProviders>{children}</WorkspaceProviders>;
}
