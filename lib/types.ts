export type Gender = "Men" | "Women";
export type EventType = "individual" | "relay";
export type EventStatus = "not_uploaded" | "pending_review" | "confirmed";
export type ResultStatus = "finished" | "DNS" | "DQ" | "DNF" | "NS" | "WD";

export type Team = {
  id: number;
  code: string;
  name: string;
};

export type MeetEvent = {
  id: number;
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
};

export type StandingRow = {
  team_id: number;
  code: string;
  name: string;
  points: number;
  placeCounts: [number, number, number, number, number, number];
  rank: number;
};

export const RESULT_STATUSES: ResultStatus[] = [
  "finished",
  "DNS",
  "DQ",
  "DNF",
  "NS",
  "WD",
];
