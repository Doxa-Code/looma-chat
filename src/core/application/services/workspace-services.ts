import { Workspace } from "@/core/domain/value-objects/workspace";
import { WorkspacesRepository } from "@/core/infra/repositories/workspaces-repository";

export class WorkspaceServices {
  constructor(private readonly workspacesRepository: WorkspacesRepository) {}

  // TODO: VER PRA QUE?
  async create(name: string) {
    const workspace = Workspace.create(name);
    await this.workspacesRepository.upsert(workspace);
    return workspace.id;
  }

  static instance() {
    return new WorkspaceServices(WorkspacesRepository.instance());
  }
}
