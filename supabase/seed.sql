-- Seed teams and the 2026 championship schedule.
-- Safe to re-run: uses ON CONFLICT on unique keys.

insert into public.teams (code, name) values
  ('COL', 'University of Colombo'),
  ('SAB', 'Sabaragamuwa University of Sri Lanka'),
  ('KEL', 'University of Kelaniya'),
  ('MOR', 'University of Moratuwa'),
  ('SJP', 'University of Sri Jayewardenepura'),
  ('UVA', 'Uva Wellassa University'),
  ('RUH', 'University of Ruhuna'),
  ('PER', 'University of Peradeniya'),
  ('JAF', 'University of Jaffna'),
  ('WAY', 'Wayamba University of Sri Lanka'),
  ('RAJ', 'Rajarata University of Sri Lanka'),
  ('VAU', 'University of Vavuniya')
on conflict (code) do update set name = excluded.name;

insert into public.events (day, event_number, name, gender, event_type, status) values
  -- Day 1 — 1 August 2026
  (1, 1,  '400m Freestyle',            'Men',   'individual', 'not_uploaded'),
  (1, 2,  '200m Freestyle',            'Women', 'individual', 'not_uploaded'),
  (1, 3,  '100m Breaststroke',         'Men',   'individual', 'not_uploaded'),
  (1, 4,  '100m Breaststroke',         'Women', 'individual', 'not_uploaded'),
  (1, 5,  '200m Freestyle',            'Men',   'individual', 'not_uploaded'),
  (1, 6,  '100m Backstroke',           'Women', 'individual', 'not_uploaded'),
  (1, 7,  '200m Breaststroke',         'Men',   'individual', 'not_uploaded'),
  (1, 8,  '100m Freestyle',            'Women', 'individual', 'not_uploaded'),
  (1, 9,  '100m Butterfly',            'Men',   'individual', 'not_uploaded'),
  (1, 10, '200m Backstroke',           'Men',   'individual', 'not_uploaded'),
  (1, 11, '100m Butterfly',            'Women', 'individual', 'not_uploaded'),
  (1, 12, '50m Butterfly',             'Men',   'individual', 'not_uploaded'),
  (1, 13, '200m Individual Medley',    'Women', 'individual', 'not_uploaded'),
  (1, 14, '200m Individual Medley',    'Men',   'individual', 'not_uploaded'),
  (1, 15, '4x100m Medley Relay',       'Women', 'relay',      'not_uploaded'),
  (1, 16, '4x100m Medley Relay',       'Men',   'relay',      'not_uploaded'),
  -- Day 2
  (2, 1,  '200m Butterfly',            'Men',   'individual', 'not_uploaded'),
  (2, 2,  '50m Butterfly',             'Women', 'individual', 'not_uploaded'),
  (2, 3,  '100m Freestyle',            'Men',   'individual', 'not_uploaded'),
  (2, 4,  '50m Breaststroke',          'Women', 'individual', 'not_uploaded'),
  (2, 5,  '100m Backstroke',           'Men',   'individual', 'not_uploaded'),
  (2, 6,  '50m Freestyle',             'Women', 'individual', 'not_uploaded'),
  (2, 7,  '50m Breaststroke',          'Men',   'individual', 'not_uploaded'),
  (2, 8,  '50m Backstroke',            'Women', 'individual', 'not_uploaded'),
  (2, 9,  '50m Backstroke',            'Men',   'individual', 'not_uploaded'),
  (2, 10, '50m Freestyle',             'Men',   'individual', 'not_uploaded'),
  (2, 11, '4x100m Freestyle',          'Women', 'relay',      'not_uploaded'),
  (2, 12, '4x100m Freestyle',          'Men',   'relay',      'not_uploaded')
on conflict (day, event_number, gender) do update
  set name = excluded.name,
      event_type = excluded.event_type;
