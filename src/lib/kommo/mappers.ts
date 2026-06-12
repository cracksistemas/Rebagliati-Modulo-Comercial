type KommoCustomField = {
  field_id?: number;
  field_code?: string;
  values: Array<{ value: string | number | boolean; enum_id?: number; enum_code?: string }>;
};

type KommoTag = {
  id?: number;
  name?: string;
};

export type KommoLeadInput = {
  name: string;
  price?: number;
  pipelineId?: number;
  statusId?: number;
  responsibleUserId?: number;
  customFieldsValues?: KommoCustomField[];
  tags?: KommoTag[];
};

export type KommoContactInput = {
  name: string;
  firstName?: string;
  lastName?: string;
  responsibleUserId?: number;
  customFieldsValues?: KommoCustomField[];
  tags?: KommoTag[];
};

export function mapLeadInput(input: KommoLeadInput) {
  return {
    name: input.name,
    price: input.price,
    pipeline_id: input.pipelineId,
    status_id: input.statusId,
    responsible_user_id: input.responsibleUserId,
    custom_fields_values: input.customFieldsValues,
    _embedded: input.tags?.length ? { tags: input.tags } : undefined
  };
}

export function mapContactInput(input: KommoContactInput) {
  return {
    name: input.name,
    first_name: input.firstName,
    last_name: input.lastName,
    responsible_user_id: input.responsibleUserId,
    custom_fields_values: input.customFieldsValues,
    _embedded: input.tags?.length ? { tags: input.tags } : undefined
  };
}
