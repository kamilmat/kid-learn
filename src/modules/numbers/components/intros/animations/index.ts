import type { ConceptId } from '../../../types'
import type { IntroAnimation } from '../IntroFrame'
import { IskierkaCounting5 } from './iskierka-counting-5'
import { IskierkaCounting10 } from './iskierka-counting-10'
import { IskierkaSubitizing6 } from './iskierka-subitizing-6'
import { IskierkaRhythm } from './iskierka-rhythm'
import { IskierkaAddingConcrete } from './iskierka-adding-concrete'
import { PlomykBonds5 } from './plomyk-bonds-5'
import { PlomykBonds10 } from './plomyk-bonds-10'
import { PlomykTenframe } from './plomyk-tenframe'
import { PlomykAddsub10 } from './plomyk-addsub-10'
import { PlomykFactfamily } from './plomyk-factfamily'
import { OgnikDoubles } from './ognik-doubles'
import { OgnikNeardoubles } from './ognik-neardoubles'
import { OgnikMake10 } from './ognik-make10'
import { OgnikFactfamily20 } from './ognik-factfamily-20'
import { PochodniaSkipcount2 } from './pochodnia-skipcount-2'
import { PochodniaSkipcount5 } from './pochodnia-skipcount-5'
import { PochodniaSkipcount10 } from './pochodnia-skipcount-10'
import { PochodniaEqualgroups } from './pochodnia-equalgroups'
import { PochodniaArrays } from './pochodnia-arrays'
import { PochodniaCommutativity } from './pochodnia-commutativity'

export const INTRO_ANIMATIONS: Record<ConceptId, IntroAnimation> = {
  'iskierka-counting-5': IskierkaCounting5 as IntroAnimation,
  'iskierka-counting-10': IskierkaCounting10 as IntroAnimation,
  'iskierka-subitizing-6': IskierkaSubitizing6 as IntroAnimation,
  'iskierka-rhythm': IskierkaRhythm as IntroAnimation,
  'iskierka-adding-concrete': IskierkaAddingConcrete as IntroAnimation,
  'plomyk-bonds-5': PlomykBonds5 as IntroAnimation,
  'plomyk-bonds-10': PlomykBonds10 as IntroAnimation,
  'plomyk-tenframe': PlomykTenframe as IntroAnimation,
  'plomyk-addsub-10': PlomykAddsub10 as IntroAnimation,
  'plomyk-factfamily': PlomykFactfamily as IntroAnimation,
  'ognik-doubles': OgnikDoubles as IntroAnimation,
  'ognik-neardoubles': OgnikNeardoubles as IntroAnimation,
  'ognik-make10': OgnikMake10 as IntroAnimation,
  'ognik-factfamily-20': OgnikFactfamily20 as IntroAnimation,
  'pochodnia-skipcount-2': PochodniaSkipcount2 as IntroAnimation,
  'pochodnia-skipcount-5': PochodniaSkipcount5 as IntroAnimation,
  'pochodnia-skipcount-10': PochodniaSkipcount10 as IntroAnimation,
  'pochodnia-equalgroups': PochodniaEqualgroups as IntroAnimation,
  'pochodnia-arrays': PochodniaArrays as IntroAnimation,
  'pochodnia-commutativity': PochodniaCommutativity as IntroAnimation,
}
