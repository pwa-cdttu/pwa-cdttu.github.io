import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { read, utils } from 'xlsx';
import { Workbook } from 'exceljs';
import * as fs from 'file-saver';
import { DatePipe } from '@angular/common';

type Mutable<T> = { -readonly [P in keyof T]: T[P] }
@Injectable({
  providedIn: 'root'
})
export class AdmissionsOfficeService {

  readonly EXCEL_TYPE = 'application/vnd.openxmlformatsofficedocument.spreadsheetml.sheet;charset=UTF-8';
  readonly EXCEL_EXTENSION = '.xlsx';
  readonly sheetUrl = `https://docs.google.com/spreadsheets/d/e/{id}/pub?output=xlsx`
  readonly sheetId = `2PACX-1vQbYcOhWEjk1qAFZ2BPunhuL-TWIFfuucgp423nWIXG8GqArdMoOC1BphgVyCbabA`
  readonly admissionsOfficeWorbookName = 'admissionsOffice';
  readonly admissionsOfficeWorbook: any;
  readonly settingStudentSheet = 'settingStudent'
  readonly settingStudentHeader = <any>{ id: 'Mã học viên', na: 'Họ và Tên', bi: 'Năm sinh', co: 'Tổng cộng' }
  readonly settingSubjectSheet = 'settingSubject'
  readonly settingSubjectHeader = <any>{ id: 'Mã môn học', na: 'Tên môn học' }
  readonly settingStudentData = <any>[]
  isActiveAdmissionOffice: boolean = false;

  constructor(private datePipe: DatePipe) {
    this.fetchWorkbook()
  }

  fetchWorkbook() {
    if (!this.admissionsOfficeWorbook) {
      const ref: Mutable<this> = this;
      const sheetUrl = this.sheetUrl.replace('{id}', this.sheetId)
      fetch(sheetUrl)
        .then((res: any) => res.arrayBuffer())
        .then((req => {
          const workbook = read(req)
          ref.admissionsOfficeWorbook = workbook
          this.isActiveAdmissionOffice = true
        }))
    }
  }

  getStudentSettings(request?: any): Observable<any> {
    return new Observable((observable) => {
      let querySheet = this.settingStudentSheet
      if (request?.subject && request?.time) {
        querySheet = request.subject
      }
      let studentSetting = this.admissionsOfficeWorbook.Sheets[querySheet]
      let data = this.decodeRawSheetData(studentSetting).filter((item: any) => !!item.id)
      if (data?.length === 0) {
        studentSetting = this.admissionsOfficeWorbook.Sheets[this.settingStudentSheet]
        data = this.decodeRawSheetData(studentSetting).filter((item: any) => !!item.id)
      }
      if (request?.time) {
        data = data.map((item: any) => {
          let reponseObject = <any>{}
          reponseObject['id'] = item.id
          reponseObject['na'] = item.na
          reponseObject['bi'] = item.bi
          reponseObject['checkedIn'] = item[request.time]
          return reponseObject
        })
      }
      if (!request?.subject && !request?.time) {
        const ref: Mutable<this> = this;
        ref.settingStudentData = data
      }
      const response = {
        code: data?.length > 0 ? 200 : 404,
        data: data
      }
      observable.next(response)
      observable.complete()
    })
  }

  private decodeRawSheetData(data: any, header?: any) {
    if (!!data) {
      const column = [...new Set(Object.keys(data).map((col: any) => {
        let returnData = data[col.replace(/\d+((.|,)\d+)?/, '2')]
        if (returnData) {
          if (!parseFloat(returnData['v'])) {
            return returnData['v']
          } else {
            let dateValue = new Date(returnData['v'])
            if (dateValue.toString() == 'Invalid Date') {
              const date = returnData['v'].split(/(.\d{2}\/)/)[0]
              const month = returnData['v'].split(/(.\d{2}\/)/)[1]?.replaceAll('/', '')
              const year = returnData['v'].split(' ')[0].split('/')[returnData['v'].split(' ')[0].split('/')?.length - 1]
              const time = returnData['v'].split(' ')[1]
              dateValue = new Date(`${year}-${month}-${date} ${time}`)
            }
            return dateValue.getTime()
          }
        }
      }))]?.filter((col: any) => !!col)
      const responseData = utils.sheet_to_json<any>(data, {
        header: header || column
      })?.slice(2);
      return responseData
    }
    return []
  }

  getSubject(): Observable<any> {
    return new Observable((observable) => {
      const subjectSetting = this.admissionsOfficeWorbook.Sheets[this.settingSubjectSheet]
      const data = this.decodeRawSheetData(subjectSetting)
      const response = {
        code: data?.length > 0 ? 200 : 404,
        data: data.sort((a, b) => a.id > b.id ? 1 : -1)
      }
      observable.next(response)
      observable.complete()
    })
  }

  getSubjectTime(subjectId: any): Observable<any> {
    return new Observable((observable) => {
      const subject = this.admissionsOfficeWorbook.Sheets[subjectId]
      let response = {
        code: 404,
        data: <any>[]
      }
      if (subject) {
        const objectKey = <any>Object.keys(subject).
          filter((key) => /^[a-zA-Z]*2[a-zA-Z\\s-]*$/.test(key)).
          reduce((cur, key) => { return Object.assign(cur, { [key]: new Date(subject[key]['v']).toString() != 'Invalid Date' ? subject[key]['v'] : subject[key]['w'] }) }, {})
        const subjectArray = Object.keys(objectKey).map((item: any) => {
          let dateValue = new Date(objectKey[item])
          if (dateValue.toString() == 'Invalid Date') {
            const date = objectKey[item].split(/(.\d{2}\/)/)[0]
            const month = objectKey[item].split(/(.\d{2}\/)/)[1]?.replaceAll('/', '')
            const year = objectKey[item].split(' ')[0].split('/')[objectKey[item].split(' ')[0].split('/')?.length - 1]
            const time = objectKey[item].split(' ')[1]
            dateValue = new Date(`${year}-${month}-${date} ${time}`)
          }
          return dateValue.toString() != 'Invalid Date' ? dateValue.getTime() : undefined;
        })?.filter((item: any) => !!item)
        response = {
          code: subjectArray?.length > 0 ? 200 : 404,
          data: subjectArray
        }
      }
      observable.next(response)
      observable.complete()
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
        const studentSettingData = this.decodeRawSheetData(studentSetting)
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
        studentSettingData.forEach(d => {
          const rowHeys = Object.keys(d)
          const dataRow = settingStudentSheet.addRow(rowHeys.map((key: any) => d[key]));
          fitWidth(dataRow, config)
        });
        config.forEach((item, index) => {
          settingStudentSheet.getColumn(index + 1).width = item;
        });
        settingStudentSheet.getRow(2).outlineLevel = 1
        getSubjectSettingSheet()
      }
      const settingSubjectSheet = admissionsOfficeExportedWorbook.addWorksheet(this.settingSubjectSheet);
      const getSubjectSettingSheet = () => {
        const keys = Object.keys(this.settingSubjectHeader)
        settingSubjectSheet.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A1' }];
        // Add Header Row
        const headerRow = settingSubjectSheet.addRow(keys.map((item: any) => this.settingSubjectHeader[item]));
        const headerRowKey = settingSubjectSheet.addRow(keys.map((item: any) => item));
        const subjectSetting = this.admissionsOfficeWorbook.Sheets[this.settingSubjectSheet]
        let subjectSettingData = this.decodeRawSheetData(subjectSetting)
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
        subjectSettingData.forEach(d => {
          const rowHeys = Object.keys(d)
          const dataRow = settingSubjectSheet.addRow(rowHeys.map((key: any) => d[key]));
          fitWidth(dataRow, config)
        });
        config.forEach((item, index) => {
          settingSubjectSheet.getColumn(index + 1).width = item;
        });
        settingSubjectSheet.getRow(2).outlineLevel = 1
        getAttendanceSheets()
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
              remoteKeys = remoteKeys.map((rmks: any) => {
                return new Date(parseInt(rmks)).toString() == 'Invalid Date' ? rmks : this.datePipe.transform(new Date(parseInt(rmks)), 'dd/MM/YYYY HH:mm:ss')
              })
              rowKeys = rowKeys.map((rmks: any) => {
                return new Date(parseInt(rmks)).toString() == 'Invalid Date' ? rmks : this.datePipe.transform(new Date(parseInt(rmks)), 'dd/MM/YYYY HH:mm:ss')
              })
              const subjectHeaderRow = saveLogTimeSheet.addRow(remoteKeys);
              const subjectHeaderRowKey = saveLogTimeSheet.addRow(remoteKeys.map((item: any) => this.settingStudentHeader[item]?.name ? this.settingStudentHeader[item]?.name : item));
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
                const dataRow = saveLogTimeSheet.addRow(rowKeys.map((key: any) => d[key]));
                fitWidth(dataRow, config)
              })
              config.forEach((item, index) => {
                saveLogTimeSheet.getColumn(index + 1).width = item;
              });
              saveLogTimeSheet.getRow(2).outlineLevel = 1
              saveLogTimeSheet.addConditionalFormatting({
                ref: 'E3:Z1000',
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
            subjectRemoteData = this.decodeRawSheetData(subjectRemote)
            handleLocalData()
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
}
