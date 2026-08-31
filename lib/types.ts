export type Gender = "Men" | "Women" | "Boys" | "Girls" | "Mixed";
export type EventType = "individual" | "relay";
export type EventStatus = "not_uploaded" | "pending_review" | "confirmed";
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
  created_at?: string;
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
  team_code?: string;
  team_name?: string;
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
export const MEET_STATUSES: MeetStatus[] = ["draft", "live", "completed"];
