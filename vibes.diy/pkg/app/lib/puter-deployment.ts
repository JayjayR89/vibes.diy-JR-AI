/**
 * Puter Cloud Deployment Service
 * Handles deploying web apps to Puter Cloud environment
 */

export interface PuterDeploymentOptions {
  appName: string;
  appContent: string;
  description?: string;
}

export interface PuterDeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  appId?: string;
  error?: string;
}

export class PuterDeploymentService {
  private static instance: PuterDeploymentService;
  private puter: any = null;

  static getInstance(): PuterDeploymentService {
    if (!PuterDeploymentService.instance) {
      PuterDeploymentService.instance = new PuterDeploymentService();
    }
    return PuterDeploymentService.instance;
  }

  private async initializePuter(): Promise<void> {
    if (this.puter) return;

    if (typeof window !== "undefined" && (window as any).puter) {
      this.puter = (window as any).puter;
    } else {
      try {
        const puterModule = await import(/* @vite-ignore */ "@heyputer/puter.js");
        this.puter = puterModule.default || puterModule;
        (window as any).puter = this.puter;
      } catch (error) {
        throw new Error("Failed to load Puter.js library");
      }
    }
  }

  /**
   * Check if user is authenticated with Puter
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.initializePuter();
      if (!this.puter?.auth?.getToken) return false;
      
      const token = await this.puter.auth.getToken();
      return !!token;
    } catch {
      return false;
    }
  }

  /**
   * Deploy app to Puter Cloud
   */
  async deployToPuterCloud(options: PuterDeploymentOptions): Promise<PuterDeploymentResult> {
    try {
      await this.initializePuter();

      // Check authentication
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error("Not authenticated with Puter. Please login first.");
      }

      // Check if hosting is available
      if (!this.puter?.hosting) {
        throw new Error("Puter hosting service not available");
      }

      // Prepare the app for deployment
      const appData = {
        name: options.appName,
        html: options.appContent,
        description: options.description || `Web app: ${options.appName}`,
        type: "webapp"
      };

      // Deploy to Puter Cloud
      const result = await this.puter.hosting.deploy(appData);

      return {
        success: true,
        deploymentUrl: result?.url || result?.deploymentUrl,
        appId: result?.id || result?.appId
      };

    } catch (error) {
      console.error("Puter deployment failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown deployment error"
      };
    }
  }

  /**
   * Get user's deployed apps from Puter
   */
  async getDeployedApps(): Promise<any[]> {
    try {
      await this.initializePuter();
      
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error("Not authenticated with Puter");
      }

      if (!this.puter?.hosting?.list) {
        throw new Error("Puter hosting list service not available");
      }

      const apps = await this.puter.hosting.list();
      return apps || [];
    } catch (error) {
      console.error("Failed to get deployed apps:", error);
      return [];
    }
  }

  /**
   * Delete a deployed app from Puter
   */
  async deleteApp(appId: string): Promise<boolean> {
    try {
      await this.initializePuter();
      
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error("Not authenticated with Puter");
      }

      if (!this.puter?.hosting?.delete) {
        throw new Error("Puter hosting delete service not available");
      }

      await this.puter.hosting.delete(appId);
      return true;
    } catch (error) {
      console.error("Failed to delete app:", error);
      return false;
    }
  }
}

// Export singleton instance
export const puterDeploymentService = PuterDeploymentService.getInstance();