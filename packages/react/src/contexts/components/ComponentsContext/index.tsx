'use client'
import { createContext } from 'react'
import { RunStep } from '@/components/runSteps/RunStep'
import { Function } from '@/components/functions/Function'
import { StartingToolCalls } from '@/components/toolCalls/StartingToolCalls'
import { TextContent } from '@/components/contents/TextContent'
import { ImageFileContent } from '@/components/contents/ImageFileContent'

export const ComponentsContext = createContext({
  components: {
    RunStep,
    Function,
    StartingToolCalls,
    TextContent,
    ImageFileContent,
  },
})
