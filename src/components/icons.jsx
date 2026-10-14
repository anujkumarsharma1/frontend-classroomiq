// Pixel icons from pixelarticons (MIT, https://github.com/halfmage/pixelarticons), exposed under the names the app already uses.
import { ChartLine } from 'pixelarticons/react/ChartLine.js'
import { ArrowRight as PArrowRight } from 'pixelarticons/react/ArrowRight.js'
import { Briefcase as PBriefcase } from 'pixelarticons/react/Briefcase.js'
import { Check as PCheck } from 'pixelarticons/react/Check.js'
import { ChevronDown as PChevronDown } from 'pixelarticons/react/ChevronDown.js'
import { Clock as PClock } from 'pixelarticons/react/Clock.js'
import { Cpu as PCpu } from 'pixelarticons/react/Cpu.js'
import { DoorClosed } from 'pixelarticons/react/DoorClosed.js'
import { Download as PDownload } from 'pixelarticons/react/Download.js'
import { Eye as PEye } from 'pixelarticons/react/Eye.js'
import { EyeOff as PEyeOff } from 'pixelarticons/react/EyeOff.js'
import { HumanArmsDown } from 'pixelarticons/react/HumanArmsDown.js'
import { Grid3x3 as PGrid3x3 } from 'pixelarticons/react/Grid3x3.js'
import { Layout } from 'pixelarticons/react/Layout.js'
import { Logout } from 'pixelarticons/react/Logout.js'
import { Monitor as PMonitor } from 'pixelarticons/react/Monitor.js'
import { Plus as PPlus } from 'pixelarticons/react/Plus.js'
import { Radio as PRadio } from 'pixelarticons/react/Radio.js'
import { AiScan } from 'pixelarticons/react/AiScan.js'
import { SquareAlert } from 'pixelarticons/react/SquareAlert.js'
import { Shield } from 'pixelarticons/react/Shield.js'
import { TrendingUp as PTrendingUp } from 'pixelarticons/react/TrendingUp.js'
import { User as PUser } from 'pixelarticons/react/User.js'
import { UserPlus as PUserPlus } from 'pixelarticons/react/UserPlus.js'
import { UserX as PUserX } from 'pixelarticons/react/UserX.js'
import { Users as PUsers } from 'pixelarticons/react/Users.js'
import { Close } from 'pixelarticons/react/Close.js'
import { Webcam as PWebcam } from 'pixelarticons/react/Webcam.js'

const wrap = (C) => {
  const I = ({ size = 24, className = '', ...rest }) => {
    const s = Math.max(16, Math.round(size / 8) * 8)
    return <C width={s} height={s} className={`px-icon ${className}`} aria-hidden={rest['aria-label'] ? undefined : true} focusable="false" {...rest} />
  }
  return I
}
export const Activity = wrap(ChartLine)
export const ArrowRight = wrap(PArrowRight)
export const Briefcase = wrap(PBriefcase)
export const Check = wrap(PCheck)
export const ChevronDown = wrap(PChevronDown)
export const Clock = wrap(PClock)
export const Cpu = wrap(PCpu)
export const DoorOpen = wrap(DoorClosed)
export const Download = wrap(PDownload)
export const Eye = wrap(PEye)
export const EyeOff = wrap(PEyeOff)
export const Footprints = wrap(HumanArmsDown)
export const Grid3x3 = wrap(PGrid3x3)
export const LayoutGrid = wrap(Layout)
export const LogOut = wrap(Logout)
export const Monitor = wrap(PMonitor)
export const Plus = wrap(PPlus)
export const Radio = wrap(PRadio)
export const ScanFace = wrap(AiScan)
export const ShieldAlert = wrap(SquareAlert)
export const ShieldCheck = wrap(Shield)
export const TrendingUp = wrap(PTrendingUp)
export const User = wrap(PUser)
export const UserPlus = wrap(PUserPlus)
export const UserX = wrap(PUserX)
export const Users = wrap(PUsers)
export const X = wrap(Close)
export const Webcam = wrap(PWebcam)
