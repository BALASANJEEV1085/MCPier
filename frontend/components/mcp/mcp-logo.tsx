'use client'

import {
  SiGithub,
  SiPostgresql,
  SiDocker,
  SiGodotengine,
  SiGitlab,
  SiMongodb,
  SiRedis,
  SiKubernetes,
  SiGooglecloud,
  SiNotion,
  SiLinear,
  SiJira,
  SiSentry,
  SiGrafana,
  SiDatadog,
} from 'react-icons/si'
import { FaAws, FaSlack, FaGoogleDrive } from 'react-icons/fa6'
import { VscAzure } from 'react-icons/vsc'
import { FolderTree, Network } from 'lucide-react'
import { cn } from '@/lib/utils'

interface McpLogoProps {
  iconKey?: string
  name?: string
  className?: string
  size?: number
}

// Playwright official dual-mask vector icon
function PlaywrightIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
    >
      <path
        d="M21.5 6C16.8 6 13 9.8 13 14.5C13 15.6 13.2 16.7 13.6 17.6C13.1 17.2 12.5 17 11.9 17C10.3 17 9 18.3 9 19.9C9 20.8 9.4 21.6 10 22.1C8.7 21.1 8 19.5 8 17.7C8 13.4 11.4 10 15.7 10C16.8 10 17.8 10.2 18.7 10.7C19.5 7.9 22.1 6 25.1 6H21.5Z"
        fill="#2EAD33"
      />
      <path
        d="M24 10C19.6 10 16 13.6 16 18C16 22.4 19.6 26 24 26C28.4 26 32 22.4 32 18C32 13.6 28.4 10 24 10ZM21.5 16C22.3 16 23 16.7 23 17.5C23 18.3 22.3 19 21.5 19C20.7 19 20 18.3 20 17.5C20 16.7 20.7 16 21.5 16ZM26.5 16C27.3 16 28 16.7 28 17.5C28 18.3 27.3 19 26.5 19C25.7 19 25 18.3 25 17.5C25 16.7 25.7 16 26.5 16Z"
        fill="#45BA4B"
      />
      <path
        d="M9.5 12C5.4 12 2 15.4 2 19.5C2 23.6 5.4 27 9.5 27C13.6 27 17 23.6 17 19.5C17 15.4 13.6 12 9.5 12ZM7 18C7.8 18 8.5 18.7 8.5 19.5C8.5 20.3 7.8 21 7 21C6.2 21 5.5 20.3 5.5 19.5C5.5 18.7 6.2 18 7 18ZM12 18C12.8 18 13.5 18.7 13.5 19.5C13.5 20.3 12.8 21 12 21C11.2 21 10.5 20.3 10.5 19.5C10.5 18.7 11.2 18 12 18Z"
        fill="#E23E3E"
      />
    </svg>
  )
}

export function McpLogo({ iconKey, name, className, size = 20 }: McpLogoProps) {
  const key = (iconKey || name || '').toLowerCase()

  if (key.includes('github')) {
    return <SiGithub size={size} className={cn('text-foreground shrink-0', className)} />
  }
  if (key.includes('filesystem') || key.includes('file')) {
    return <FolderTree size={size} className={cn('text-indigo-400 shrink-0', className)} />
  }
  if (key.includes('playwright')) {
    return <PlaywrightIcon size={size} className={className} />
  }
  if (key.includes('postgres') || key.includes('postgresql')) {
    return <SiPostgresql size={size} className={cn('text-[#336791] shrink-0', className)} />
  }
  if (key.includes('docker')) {
    return <SiDocker size={size} className={cn('text-[#2496ed] shrink-0', className)} />
  }
  if (key.includes('aws') || key.includes('amazon')) {
    return <FaAws size={size} className={cn('text-[#ff9900] shrink-0', className)} />
  }
  if (key.includes('godot')) {
    return <SiGodotengine size={size} className={cn('text-[#478cbf] shrink-0', className)} />
  }
  if (key.includes('slack')) {
    return <FaSlack size={size} className={cn('text-[#e01e5a] shrink-0', className)} />
  }
  if (key.includes('drive') || key.includes('gdrive')) {
    return <FaGoogleDrive size={size} className={cn('text-[#4285f4] shrink-0', className)} />
  }
  if (key.includes('gitlab')) {
    return <SiGitlab size={size} className={cn('text-[#fc6d26] shrink-0', className)} />
  }
  if (key.includes('mongo') || key.includes('mongodb')) {
    return <SiMongodb size={size} className={cn('text-[#13aa52] shrink-0', className)} />
  }
  if (key.includes('redis')) {
    return <SiRedis size={size} className={cn('text-[#dc382d] shrink-0', className)} />
  }
  if (key.includes('kubernetes') || key.includes('k8s')) {
    return <SiKubernetes size={size} className={cn('text-[#326ce5] shrink-0', className)} />
  }
  if (key.includes('azure')) {
    return <VscAzure size={size} className={cn('text-[#0089d6] shrink-0', className)} />
  }
  if (key.includes('gcp') || key.includes('google cloud') || key.includes('google-cloud')) {
    return <SiGooglecloud size={size} className={cn('text-[#ea4335] shrink-0', className)} />
  }
  if (key.includes('notion')) {
    return <SiNotion size={size} className={cn('text-foreground shrink-0', className)} />
  }
  if (key.includes('linear')) {
    return <SiLinear size={size} className={cn('text-[#5e6ad2] shrink-0', className)} />
  }
  if (key.includes('jira')) {
    return <SiJira size={size} className={cn('text-[#0052cc] shrink-0', className)} />
  }
  if (key.includes('sentry')) {
    return <SiSentry size={size} className={cn('text-[#9b87f5] shrink-0', className)} />
  }
  if (key.includes('grafana')) {
    return <SiGrafana size={size} className={cn('text-[#f46800] shrink-0', className)} />
  }
  if (key.includes('datadog')) {
    return <SiDatadog size={size} className={cn('text-[#632ca6] shrink-0', className)} />
  }

  return <Network size={size} className={cn('text-muted-foreground shrink-0', className)} />
}
