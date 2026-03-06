// import { create } from 'zustand';
// import { apiClient } from '@/lib/api-client';
// import {
//   User,
//   Organization,
//   Project,
//   Dataset,
//   DatasetItem,
//   Annotation,
//   MLModel,
//   Prediction,
//   Job
// } from '@/types';

// interface AppState {
//   // Auth
//   user: User | null;
//   isAuthenticated: boolean;

//   // Organizations
//   organizations: Organization[];
//   currentOrganization: Organization | null;

//   // Projects
//   projects: Project[];
//   currentProject: Project | null;

//   // Datasets
//   datasets: Dataset[];
//   currentDataset: Dataset | null;

//   // Dataset Items
//   datasetItems: DatasetItem[];

//   // Annotations
//   annotations: Annotation[];

//   // Models
//   models: MLModel[];

//   // Predictions
//   predictions: Prediction[];

//   // Jobs
//   jobs: Job[];

//   // Loading states (PRESERVED - one per entity)
//   isLoading: boolean; // Global loading
//   isLoadingOrganizations: boolean;
//   isLoadingProjects: boolean;
//   isLoadingDatasets: boolean;
//   isLoadingDatasetItems: boolean;
//   isLoadingAnnotations: boolean;
//   isLoadingModels: boolean;
//   isLoadingPredictions: boolean;
//   isLoadingJobs: boolean;

//   // Meta
//   error: string | null;
//   organizationsLoaded: boolean;
//   projectsLoaded: boolean;
//   modelsLoaded: boolean;

//   // Setters
//   setUser: (user: User | null) => void;
//   setOrganizations: (orgs: Organization[]) => void;
//   setCurrentOrganization: (org: Organization | null) => void;
//   setProjects: (projects: Project[]) => void;
//   setCurrentProject: (project: Project | null) => void;
//   setCurrentDataset: (dataset: Dataset | null) => void;

//   // Fetchers
//   fetchOrganizations: () => Promise<void>;
//   fetchProjects: (organizationId?: string) => Promise<void>;
//   fetchDatasets: (organizationId?: string) => Promise<void>;
//   fetchDatasetItems: (datasetId: string) => Promise<void>;
//   fetchAnnotations: (params?: {
//     project_id?: string;
//     dataset_id?: string;
//     dataset_item_id?: string;
//   }) => Promise<void>;
//   fetchModels: () => Promise<void>;
//   fetchPredictions: (params?: { dataset_id?: string; dataset_item_id?: string }) => Promise<void>;
//   fetchJobs: (datasetId?: string) => Promise<void>;

//   reset: () => void;
// }

// export const useStore = create<AppState>((set) => ({
//   // Auth
//   user: null,
//   isAuthenticated: false,

//   // Data
//   organizations: [],
//   currentOrganization: null,
//   projects: [],
//   currentProject: null,
//   datasets: [],
//   currentDataset: null,
//   datasetItems: [],
//   annotations: [],
//   models: [],
//   predictions: [],
//   jobs: [],

//   // Loading states (PRESERVED)
//   isLoading: false,
//   isLoadingOrganizations: false,
//   isLoadingProjects: false,
//   isLoadingDatasets: false,
//   isLoadingDatasetItems: false,
//   isLoadingAnnotations: false,
//   isLoadingModels: false,
//   isLoadingPredictions: false,
//   isLoadingJobs: false,

//   // Meta
//   error: null,
//   organizationsLoaded: false,
//   projectsLoaded: false,
//   modelsLoaded: false,

//   // Setters
//   setUser: (user) => set({ user, isAuthenticated: !!user }),
//   setOrganizations: (organizations) => set({ organizations }),
//   setCurrentOrganization: (org) => set({ currentOrganization: org }),
//   setProjects: (projects) => set({ projects }),
//   setCurrentProject: (project) => set({ currentProject: project }),
//   setCurrentDataset: (dataset) => set({ currentDataset: dataset }),

//   reset: () =>
//     set({
//       user: null,
//       isAuthenticated: false,
//       organizations: [],
//       currentOrganization: null,
//       projects: [],
//       currentProject: null,
//       datasets: [],
//       currentDataset: null,
//       datasetItems: [],
//       annotations: [],
//       models: [],
//       predictions: [],
//       jobs: [],
//       isLoading: false,
//       isLoadingOrganizations: false,
//       isLoadingProjects: false,
//       isLoadingDatasets: false,
//       isLoadingDatasetItems: false,
//       isLoadingAnnotations: false,
//       isLoadingModels: false,
//       isLoadingPredictions: false,
//       isLoadingJobs: false,
//       error: null,
//       organizationsLoaded: false,
//       projectsLoaded: false,
//       modelsLoaded: false,
//     }),

//   // Fetchers
//   fetchOrganizations: async () => {
//     set({ isLoadingOrganizations: true, error: null });
//     try {
//       const organizations = await apiClient.getOrganizations();
//       set({ organizations, organizationsLoaded: true });
//     } catch (e: any) {
//       set({ error: e.message });
//     } finally {
//       set({ isLoadingOrganizations: false });
//     }
//   },

//   fetchProjects: async (organizationId?: string) => {
//     set({ isLoadingProjects: true, error: null });
//     try {
//       const projects = await apiClient.getProjects(organizationId);
//       set({ projects, projectsLoaded: true });
//     } catch (e: any) {
//       set({ error: e.message });
//     } finally {
//       set({ isLoadingProjects: false });
//     }
//   },

//   fetchDatasets: async (organizationId?: string) => {
//     set({ isLoadingDatasets: true, error: null });
//     try {
//       const datasets = await apiClient.getDatasets(organizationId);
//       set({ datasets });
//     } catch (e: any) {
//       set({ error: e.message });
//     } finally {
//       set({ isLoadingDatasets: false });
//     }
//   },

// fetchDatasetItems: async (datasetId: string) => {
//   set({ isLoadingDatasetItems: true, error: null });
//   try {
//     const items = await apiClient.listDatasetItems(datasetId);
//     set({ datasetItems: items || [] });
//   } catch (e: any) {
//     set({ error: e.message, datasetItems: [] });
//   } finally {
//     set({ isLoadingDatasetItems: false });
//   }
// },

//   fetchAnnotations: async (params) => {
//     set({ isLoadingAnnotations: true, error: null });
//     try {
//       const annotations = await apiClient.getAnnotations(params);
//       set({ annotations });
//     } catch (e: any) {
//       set({ error: e.message });
//     } finally {
//       set({ isLoadingAnnotations: false });
//     }
//   },

//   fetchModels: async () => {
//     set({ isLoadingModels: true, error: null });
//     try {
//       const models = await apiClient.getModels({ is_public: true });
//       set({ models, modelsLoaded: true });
//     } catch (e: any) {
//       set({ error: e.message });
//     } finally {
//       set({ isLoadingModels: false });
//     }
//   },

//   fetchPredictions: async (params) => {
//     set({ isLoadingPredictions: true, error: null });
//     try {
//       const predictions = await apiClient.getPredictions(params);
//       set({ predictions });
//     } catch (e: any) {
//       set({ error: e.message });
//     } finally {
//       set({ isLoadingPredictions: false });
//     }
//   },

//   fetchJobs: async (datasetId) => {
//     set({ isLoadingJobs: true, error: null });
//     try {
//       const jobs = await apiClient.getJobs(datasetId ? { dataset_id: datasetId } : {});
//       set({ jobs });
//     } catch (e: any) {
//       set({ error: e.message });
//     } finally {
//       set({ isLoadingJobs: false });
//     }
//   },
// }));