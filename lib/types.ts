export type Gender = "Men" | "Women" | "Boys" | "Girls" | "Mixed";
export type EventType = "individual" | "relay";
export type EventStatus = "not_uploaded" | "pending_review" | "confirmed";
export type EventRound = "prelim" | "final" | "timed_final";
export type EventSession = "morning" | "evening" | "unspecified";
export type ResultStatus = "finished" | "DNS" | "DQ" | "DNF" | "NS" | "WD";
export type MeetStatus = "draft" | "live" | "completed";
export type MeetRoleName = "meet_admin" | "official";

export type PointsConfig = {
  max_places: number;
  individual: Record<string, number>;
  relay: Record<string, number>;
};

export type Meet = {
  id: string;
  slug: string;
  name: string;
  participant_label: string;
  status: MeetStatus;
  points_config: PointsConfig;
  pdfs_public: boolean;
  logo_url?: string | null;
  primary_color?: string | null;
  background_url?: string | null;
  next_results_at?: string | null;
  created_at?: string;
};

export type MeetSponsor = {
  id: string;
  meet_id: string;
  name: string;
  logo_url: string | null;
  url: string | null;
  placement: "footer" | "background" | "header";
  sort_order: number;
};

export type Team = {
  id: number;
  code: string;
  name: string;
  meet_id?: string;
};

export type MeetEvent = {
  id: number;
  meet_id?: string;
  day: number;
  event_number: number;
  name: string;
  gender: Gender;
  event_type: EventType;
  status: EventStatus;
  round?: EventRound;
  session?: EventSession;
  linked_event_id?: number | null;
  qualify_count?: number;
  scores_points?: boolean;
};

export type EventResult = {
  id: number;
  event_id: number;
  position: number | null;
  swimmer_name: string | null;
  team_id: number;
  achievement: string | null;
  result_status: ResultStatus;
  points_awarded: number;
  swimmer_id?: string | null;
};

export type Swimmer = {
  id: string;
  meet_id: string;
  team_id: number;
  name: string;
  gender: string | null;
  age_group: string | null;
  age?: number | null;
  slasu_number?: string | null;
  registered?: boolean;
  slasu_verified?: boolean;
  present?: boolean;
  notes?: string | null;
  team_code?: string;
  team_name?: string;
};

export type ImportedTeam = { code: string; name: string };

export type ImportedSwimmer = {
  name: string;
  team_code: string;
  gender: Gender | null;
  age: number | null;
  age_group: string | null;
  slasu_number: string | null;
};

export type ImportedEvent = {
  day: number;
  event_number: number;
  name: string;
  gender: Gender;
  event_type: EventType;
  round?: EventRound;
  session?: EventSession;
};

export type ExtractedResult = {
  position: number | null;
  name: string;
  team_code: string;
  achievement: string;
  status: ResultStatus;
};

export type ExtractionPayload = {
  event_number: number | null;
  event_name: string | null;
  gender: Gender | null;
  results: ExtractedResult[];
};

export type ReviewedResult = {
  position: number | null;
  swimmer_name: string;
  team_code: string;
  achievement: string;
  result_status: ResultStatus;
};

export type PublishRow = {
  position: number | null;
  swimmer_name: string;
  team_id: number;
  achievement: string;
  result_status: ResultStatus;
  points_awarded: number;
  swimmer_id?: string | null;
};

export type StandingRow = {
  team_id: number;
  code: string;
  name: string;
  points: number;
  placeCounts: number[];
  rank: number;
};

export type SwimmerStandingRow = {
  swimmer_id: string;
  name: string;
  team_id: number;
  team_code: string;
  team_name: string;
  points: number;
  events_entered: number;
  rank: number;
};

export type OrgSettings = {
  id: number;
  name: string;
  logo_url: string | null;
  primary_color: string;
  footer_text: string;
};

export type Access = {
  userId: string;
  email: string | null;
  isSuperAdmin: boolean;
  meetRole: MeetRoleName | null;
  canManage: boolean;
  canScore: boolean;
};

export const RESULT_STATUSES: ResultStatus[] = [
  "finished",
  "DNS",
  "DQ",
  "DNF",
  "NS",
  "WD",
];

export const GENDERS: Gender[] = ["Men", "Women", "Boys", "Girls", "Mixed"];
export const EVENT_TYPES: EventType[] = ["individual", "relay"];
export const EVENT_ROUNDS: EventRound[] = ["prelim", "final", "timed_final"];
export const EVENT_SESSIONS: EventSession[] = ["morning", "evening", "unspecified"];
export const MEET_STATUSES: MeetStatus[] = ["draft", "live", "completed"];
