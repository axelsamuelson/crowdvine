-- Add story text + alcohol fields for wines
alter table wines
  add column if not exists info_section_text text,
  add column if not exists alcohol_percentage text;

comment on column wines.info_section_text is
  'Long-form copy shown beneath the PDP white info grid';

comment on column wines.alcohol_percentage is
  'Alcohol level displayed alongside grape/color info';

