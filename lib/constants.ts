/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Default Live API model to use
 */
export const DEFAULT_LIVE_API_MODEL =
  'gemini-2.5-flash-native-audio-preview-09-2025';

export const DEFAULT_VOICE = 'Aoede';

export const AVAILABLE_VOICES = ['Zephyr', 'Puck', 'Charon', 'Luna', 'Nova', 'Kore', 'Fenrir',	'Leda', 'Orus','Aoede','Callirrhoe','Autonoe','Enceladus','Iapetus','Umbriel','Algieba','Despina','Erinome','Algenib','Rasalgethi','Laomedeia','Achernar','Alnilam','Schedar','Gacrux','Pulcherrima','Achird',	'Zubenelgenubi','Vindemiatrix','Sadachbia','Sadaltager','Sulafat'];

export const VOICE_NAME_MAP: Record<string, string> = {
  'Aoede': 'Beatris',
  'Zephyr': 'Jose',
  'Puck': 'Andres',
  'Charon': 'Emilio',
  'Luna': 'Juan',
  'Nova': 'Gabriela',
  'Kore': 'Melchora',
  'Fenrir': 'Lapu',
  'Leda': 'Teresa',
  'Orus': 'Gregorio',
  'Callirrhoe': 'Apolinario',
  'Autonoe': 'Marcelo',
  'Enceladus': 'Antonio',
  'Iapetus': 'Jacinto',
  'Umbriel': 'Mariano',
  'Algieba': 'Graciano',
  'Despina': 'Josefa',
  'Erinome': 'Trinidad',
  'Algenib': 'Diego',
  'Rasalgethi': 'Sultan',
  'Laomedeia': 'Panday',
  'Achernar': 'Rajah',
  'Alnilam': 'Francisco',
  'Schedar': 'Geronimo',
  'Gacrux': 'Vicente',
  'Pulcherrima': 'Clemencia',
  'Achird': 'Agueda',
  'Zubenelgenubi': 'Patrocinio',
  'Vindemiatrix': 'Henerala',
  'Sadachbia': 'Nazaria',
  'Sadaltager': 'Macario',
  'Sulafat': 'Artemio',
};
