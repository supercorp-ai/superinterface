'use client'
import { createContext } from 'react'
import { RunStep } from '@/components/runSteps/RunStep'
import { StartingToolCalls } from '@/components/toolCalls/StartingToolCalls'
import { Function } from '@/components/functions/Function'
import { CodeInterpreterToolCall } from '@/components/toolCalls/CodeInterpreterToolCall'
import { FileSearchToolCall } from '@/components/toolCalls/FileSearchToolCall'
import { FallbackToolCall } from '@/components/toolCalls/FallbackToolCall'
import { TextContent } from '@/components/contents/TextContent'
import { ImageFileContent } from '@/components/contents/ImageFileContent'
import { MessageGroup } from '@/components/messageGroups/MessageGroup'
import { MessageAttachments } from '@/components/messages/MessageAttachments'

export const ComponentsContext = createContext({
  components: {
    RunStep,
    StartingToolCalls,
    Function,
    CodeInterpreterToolCall,
    FileSearchToolCall,
    FallbackToolCall,
    TextContent,
    ImageFileContent,
    MessageGroup,
    MessageAttachments,
  },
})
