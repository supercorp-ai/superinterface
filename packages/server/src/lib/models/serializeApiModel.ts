import type OpenAI from 'openai'

export const serializeApiModel = ({ model }: { model: OpenAI.Model }) => ({
  id: model.id,
})
