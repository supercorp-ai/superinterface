'use client'
import OpenAI from 'openai'
import { createContext, Dispatch, SetStateAction } from 'react'

export const MessageFormContext = createContext({
  content: '',
  isDisabled: false,
  isLoading: false,
  files: [] as OpenAI.Files.FileObject[],
  setFiles: (() => {}) as Dispatch<SetStateAction<OpenAI.Files.FileObject[]>>,
  isFileLoading: false,
})
