import { Injectable, isDevMode } from '@angular/core';
import { Observable, observable } from 'rxjs';
import { read, utils } from 'xlsx';
import { Workbook } from 'exceljs';
import * as fs from 'file-saver';
import { DatePipe } from '@angular/common';
import { SheetService } from '../sheet/sheet.service';

type Mutable<T> = { -readonly [P in keyof T]: T[P] }
@Injectable({
  providedIn: 'root'
})
export class AdmissionsOfficeService {

  readonly EXCEL_TYPE = 'application/vnd.openxmlformatsofficedocument.spreadsheetml.sheet;charset=UTF-8';
  readonly EXCEL_EXTENSION = '.xlsx';
  // readonly sheetId = `2PACX-1vQbYcOhWEjk1qAFZ2BPunhuL-TWIFfuucgp423nWIXG8GqArdMoOC1BphgVyCbabA`
  readonly sheetId = isDevMode() ? `2PACX-1vSuwMAAYOYwCQqbnNz-_fIb6EHBAmBG0J84jl_3wDPDz7V6sBuUm9iImBioeU8gGw` : `2PACX-1vQbYcOhWEjk1qAFZ2BPunhuL-TWIFfuucgp423nWIXG8GqArdMoOC1BphgVyCbabA`
  readonly admissionsOfficeWorbookName = 'admissionsOffice';
  readonly admissionsOfficeWorbook: any;
  readonly settingStudentSheet = 'settingStudent'
  readonly settingStudentHeader = <any>{ id: 'Mã học viên', na: 'Họ và Tên', bi: 'Năm sinh', co: 'Tổng cộng' }
  readonly settingSubjectSheet = 'settingSubject'
  readonly settingSubjectHeader = <any>{ id: 'Mã môn học', na: 'Tên môn học' }
  readonly settingStudentData = <any>[]
  isActiveAdmissionOffice: boolean = false;

  constructor(
    private datePipe: DatePipe,
    private sheetService: SheetService
  ) {
  }

  fetchAddmissionData(): Observable<any> {
    const ref: Mutable<this> = this;
    return new Observable((observable) => {
      this.sheetService.fetchSheet(this.sheetId)
        .subscribe((res: any) => {
          if (res.status === 200) {
            ref.admissionsOfficeWorbook = res.workbook;
            observable.next({
              status: 200,
              data: ref.admissionsOfficeWorbook
            })
          }
        })
    });
  }

  getSubject(): Observable<any> {
    const ref: Mutable<this> = this;
    return new Observable((observable) => {
      if (this.admissionsOfficeWorbook) {
        const sheet = this.admissionsOfficeWorbook.Sheets['settingSubject']
        this.sheetService.decodeRawSheetData(sheet, 2)
          .subscribe((res: any) => {
            observable.next({
              status: 200,
              data: res
            })
          })
      } else {
        this.fetchAddmissionData().subscribe();
      }
    });
  }

  getSubjectTime(subjectId: any): Observable<any> {
    return new Observable((observable) => {
      const subject = this.admissionsOfficeWorbook.Sheets[subjectId]
      let response = {
        status: 404,
        data: <any>[]
      }
      if (subject) {
        const objectKey = <any>Object.keys(subject).
          filter((key) => /^[a-zA-Z]*2[a-zA-Z\\s-]*$/.test(key)).
          reduce((cur, key) => { return Object.assign(cur, { [key]: subject[key]['w'] }) }, {})
        const subjectArray = Object.keys(objectKey).map((item: any) => {
          if (Object.keys(this.settingStudentHeader).includes(objectKey[item])) {
            return null
          }
          return objectKey[item];
        })?.filter((item: any) => !!item)
        response = {
          status: subjectArray?.length > 0 ? 200 : 404,
          data: subjectArray
        }
      }
      observable.next(response)
      observable.complete()
    })
  }

  getStudentSettings(request?: any): Observable<any> {
    return new Observable((observable) => {
      let querySheet = this.settingStudentSheet
      if (request?.subject && request?.time) {
        if (this.admissionsOfficeWorbook.SheetNames.includes(request?.subject)) {
          querySheet = request.subject
        }
      }
      let studentSetting = this.admissionsOfficeWorbook.Sheets[querySheet]
      let data = <any>[];
      this.sheetService.decodeRawSheetData(studentSetting, 2).subscribe((res: any) => {
        data = res.filter((item: any) => !!item.id);
        if (request?.time) {
          data = data.map((item: any) => {
            let reponseObject = <any>{}
            reponseObject['id'] = item.id
            reponseObject['na'] = item.na
            reponseObject['bi'] = item.bi
            reponseObject['checkedIn'] = item[request.time]
            reponseObject['checked'] = item[request.time] > 0 ? true : false
            return reponseObject
          })
        }
        if (!request?.subject && !request?.time) {
          const ref: Mutable<this> = this;
          ref.settingStudentData = data
        }
        const response = {
          status: data?.length > 0 ? 200 : 404,
          data: data
        }
        observable.next(response)
        observable.complete()
      })
    })
  }

  syncData(): Observable<any> {
    return new Observable((observable) => {
      const admissionsOfficeExportedWorbook = new Workbook();
      const fitWidth = (data: any, config: any) => {
        data.eachCell((item: any, index: any) => {
          if (item.value?.length > config[index - 1]) {
            config[index - 1] = item.value?.length + 3
          }
        })
        return []
      }
      const getStudentSettingSheet = () => {
        const settingStudentSheet = admissionsOfficeExportedWorbook.addWorksheet(this.settingStudentSheet);
        const keys = Object.keys(this.settingStudentHeader)
        settingStudentSheet.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A1' }];
        // Add Header Row
        const headerRow = settingStudentSheet.addRow(keys.map((item: any) => this.settingStudentHeader[item]));
        const headerRowKey = settingStudentSheet.addRow(keys.map((item: any) => item));
        const studentSetting = this.admissionsOfficeWorbook.Sheets[this.settingStudentSheet]
        let studentSettingData = <any>[]
        this.sheetService.decodeRawSheetData(studentSetting, 2).subscribe((res: any) => {
          studentSettingData = res
          let config = keys.map(() => 0)
          headerRow.eachCell((cell, number) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFF' },
              bgColor: { argb: 'FFFFFF' }
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            cell.font = {
              bold: true
            }
          });
          headerRowKey.eachCell((cell, number) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFF' },
              bgColor: { argb: 'FFFFFF' }
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            cell.font = {
              bold: true
            }
          });
          // Add Data and Conditional Formatting
          studentSettingData.forEach((d: any) => {
            const rowHeys = Object.keys(d)
            const dataRow = settingStudentSheet.addRow(rowHeys.map((key: any) => d[key]));
            fitWidth(dataRow, config)
          });
          config.forEach((item, index) => {
            settingStudentSheet.getColumn(index + 1).width = item;
          });
          settingStudentSheet.getRow(2).outlineLevel = 1
          getSubjectSettingSheet()
        })
      }
      const settingSubjectSheet = admissionsOfficeExportedWorbook.addWorksheet(this.settingSubjectSheet);
      const getSubjectSettingSheet = () => {
        const keys = Object.keys(this.settingSubjectHeader)
        settingSubjectSheet.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A1' }];
        // Add Header Row
        const headerRow = settingSubjectSheet.addRow(keys.map((item: any) => this.settingSubjectHeader[item]));
        const headerRowKey = settingSubjectSheet.addRow(keys.map((item: any) => item));
        const subjectSetting = this.admissionsOfficeWorbook.Sheets[this.settingSubjectSheet]
        let subjectSettingData = <any>[];
        this.sheetService.decodeRawSheetData(subjectSetting, 2).subscribe((res: any) => {
          subjectSettingData = res;
          const localStorageAttendance = JSON.parse(localStorage.getItem('attendance') || '[]')
          const mergeSubject = [...new Set(localStorageAttendance.map((item: any) => item.subject).concat(subjectSettingData.map((item: any) => item.id)))]
          subjectSettingData = mergeSubject.map((item: any) => {
            let returnMergeSubject = <any>{}
            if (subjectSettingData.find((ss: any) => ss.id == item)) {
              returnMergeSubject = subjectSettingData.find((ss: any) => ss.id == item)
            } else {
              const foundLocal = localStorageAttendance.find((la: any) => la.subject == item)
              returnMergeSubject['id'] = item
              returnMergeSubject['na'] = foundLocal.name
            }
            return returnMergeSubject
          })
          let config = keys.map(() => 0)
          headerRow.eachCell((cell, number) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFF' },
              bgColor: { argb: 'FFFFFF' }
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            cell.font = {
              bold: true
            }
          });
          headerRowKey.eachCell((cell, number) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFF' },
              bgColor: { argb: 'FFFFFF' }
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            cell.font = {
              bold: true
            }
          });
          // Add Data and Conditional Formatting
          subjectSettingData.forEach((d: any) => {
            const rowHeys = Object.keys(d)
            const dataRow = settingSubjectSheet.addRow(rowHeys.map((key: any) => d[key]));
            fitWidth(dataRow, config)
          });
          config.forEach((item, index) => {
            settingSubjectSheet.getColumn(index + 1).width = item;
          });
          settingSubjectSheet.getRow(2).outlineLevel = 1
          getAttendanceSheets()
        })
      }
      const getAttendanceSheets = () => {
        const remoteSubjects = this.admissionsOfficeWorbook.SheetNames?.filter((item: any) => !item.includes('setting'))
        const localStorageAttendance = JSON.parse(localStorage.getItem('attendance') || '[]')
        const mergeSubjects = [...new Set(localStorageAttendance.map((lsa: any) => lsa.subject).concat(remoteSubjects))]
        mergeSubjects.forEach((ms: any) => {
          let saveLogTimeSheet = admissionsOfficeExportedWorbook.addWorksheet(ms);
          saveLogTimeSheet.views = [{
            state: 'frozen',
            ySplit: 2,
            xSplit: 4,
            activeCell: 'A1'
          }];
          const subjectRemote = this.admissionsOfficeWorbook.Sheets[ms]
          let subjectRemoteData = <any>[]
          const handleLocalData = () => {
            const foundSubject = localStorageAttendance.find((item: any) => item.subject == ms)
            if (foundSubject) {
              const logTimes = Object.keys(foundSubject).filter((fj: any, index: any) => fj !== 'subject' && fj !== 'name')
              subjectRemoteData.forEach((std: any, index: any) => {
                logTimes.forEach((lt: any) => {
                  foundSubject[lt].forEach((fslt: any) => {
                    const localFoundRemoteByid = subjectRemoteData.find((rs: any) => rs.id == fslt.id)
                    if (std.id && index === subjectRemoteData.indexOf(localFoundRemoteByid)) {
                      subjectRemoteData[subjectRemoteData.indexOf(localFoundRemoteByid)][lt] = fslt.checkedIn
                    } else {
                      if (std.id && !subjectRemoteData[index][lt]) {
                        subjectRemoteData[index][lt] = 0
                      }
                    }
                  })
                })
              })
            }
            if (subjectRemoteData[0]) {
              let remoteKeys = Object.keys(subjectRemoteData[0])?.map((srk: any) => srk).filter((srk: any) => !!srk)
              let rowKeys = <any>[]
              if (subjectRemote) {
                const currentSubject = localStorageAttendance.find((lcs: any) => lcs.subject == ms)
                if (currentSubject) {
                  remoteKeys = [...new Set(remoteKeys = remoteKeys.concat(Object.keys(currentSubject).filter((csok: any) => csok !== 'subject' && csok !== 'name').map((fcsok: any) => {
                    return fcsok
                  })?.filter((item: any) => !!item)))]
                  rowKeys = [...new Set(remoteKeys.map((item: any) => {
                    return item
                  }))]
                } else {
                  rowKeys = [...new Set(remoteKeys.map((item: any) => {
                    return item
                  }))]
                }
              } else {
                const currentSubject = localStorageAttendance.find((lcs: any) => lcs.subject == ms)
                if (currentSubject) {
                  remoteKeys = [...new Set(remoteKeys.concat(Object.keys(currentSubject).filter((csok: any) => csok !== 'subject' && csok !== 'name').map((fcsok: any) => {
                    return fcsok
                  })?.filter((item: any) => !!item)))]
                  rowKeys = [...new Set(remoteKeys.map((item: any) => {
                    return item
                  }))]
                }
              }
              remoteKeys = remoteKeys?.filter((rk: any) => new Date(rk).toString() == "Invalid Date")?.concat(
                remoteKeys?.filter((rk: any) => new Date(rk).toString() != "Invalid Date")?.sort((a: any, b: any) => new Date(a) > new Date(b) ? 1 : -1)
              );
              rowKeys = rowKeys?.filter((rk: any) => new Date(rk).toString() == "Invalid Date")?.concat(
                remoteKeys?.filter((rk: any) => new Date(rk).toString() != "Invalid Date")?.sort((a: any, b: any) => new Date(a) > new Date(b) ? 1 : -1)
              );
              const subjectHeaderRow = saveLogTimeSheet.addRow(remoteKeys.map((item: any) => this.settingStudentHeader[item] ? this.settingStudentHeader[item] : `'${this.datePipe.transform(new Date(item), "dd/MM/yyyy HH:mm:ss")}`));
              const subjectHeaderRowKey = saveLogTimeSheet.addRow(remoteKeys);
              let config = remoteKeys.map(() => 20)
              subjectHeaderRow.eachCell((cell, number) => {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFFFFF' },
                  bgColor: { argb: 'FFFFFF' }
                };
                cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                };
                cell.font = {
                  bold: true
                }
              });
              subjectHeaderRowKey.eachCell((cell, number) => {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFFFFF' },
                  bgColor: { argb: 'FFFFFF' }
                };
                cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                };
                cell.font = {
                  bold: true
                }
              });
              subjectRemoteData.forEach((d: any, index: any) => {
                if (d['id']) {
                  d['co'] = 0
                }
                const rowKeys = Object.keys(d)
                const date = rowKeys.filter((rk: any) => parseInt(rk));
                date.forEach((da: any) => {
                  if (parseInt(d[da]) > 0) {
                    d['co'] += 1
                  }
                })
                rowKeys?.filter((k: any) => !Object.keys(this.settingStudentHeader).includes(k))?.forEach((k: any) => {
                  d[k] = Math.floor(d[k]);
                })
                const dataRow = saveLogTimeSheet.addRow(rowKeys.map((key: any) => d[key]));
                fitWidth(dataRow, config)
              })
              config.forEach((item, index) => {
                saveLogTimeSheet.getColumn(index + 1).width = item;
              });
              saveLogTimeSheet.getRow(2).outlineLevel = 1
              saveLogTimeSheet.addConditionalFormatting({
                ref: 'E3:ZY1000',
                rules: [
                  {
                    priority: 1,
                    type: 'cellIs',
                    operator: 'greaterThan',
                    formulae: [0],
                    style: {
                      fill: {
                        type: 'pattern',
                        pattern: 'solid',
                        bgColor: {
                          argb: '34a853'
                        }
                      },
                      font: {
                        color: {
                          argb: '34a853'
                        }
                      }
                    },
                  }
                ]
              })
            }
          }
          if (subjectRemote) {
            subjectRemoteData = <any>[]
            this.sheetService.decodeRawSheetData(subjectRemote, 2).subscribe((res: any) => {
              subjectRemoteData = res;
              handleLocalData()
            })
          } else {
            this.getStudentSettings().subscribe()
            subjectRemoteData = this.settingStudentData.map((item: any) => {
              const responseObject = <any>{}
              responseObject['id'] = item.id;
              responseObject['na'] = item.na;
              responseObject['bi'] = item.bi;
              responseObject['co'] = 0;
              return responseObject
            })
            handleLocalData()
          }
        })
      }
      getStudentSettingSheet()
      // Generate Excel File with given name
      admissionsOfficeExportedWorbook.xlsx.writeBuffer().then((data: any) => {
        const blob = new Blob([data], { type: this.EXCEL_TYPE });
        fs.saveAs(blob, `${this.admissionsOfficeWorbookName}${this.EXCEL_EXTENSION}`);
        const response = {
          code: 200
        }
        observable.next(response)
        observable.complete()
      });
    })
  }

  migrateFromFile(file: any): Observable<any> {
    return new Observable((observable) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const workbook = read(e.target?.result, {
          type: 'binary'
        })
        const rawData = workbook?.Sheets[workbook?.SheetNames[0]]
        let data = <any>[]
        this.sheetService.decodeRawSheetData(rawData)
          .subscribe((res: any) => {
            data = res
            if (data?.length > 0) {
              observable.next({
                status: data?.length > 0 ? 200 : 404,
                data: data,
              })
              observable.complete()
            }
          })
      }
      reader.onerror = (ex) => {
        console.log(ex);
      }
      reader.readAsBinaryString(file);
    })
  }
}
